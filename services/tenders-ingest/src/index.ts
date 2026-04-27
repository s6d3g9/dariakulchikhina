/**
 * tenders-ingest entry point.
 *
 * Boots in this order:
 *   1. loadConfig() — fail-fast on missing MAIN_APP_URL / serviceToken.
 *   2. Create logger, metrics registry, secrets resolver, publisher.
 *   3. Build all sources from SOURCE_REGISTRY (resolves secrets per
 *      source; missing secret → status `degraded:no-secret`, source
 *      stays in the list and yields zero items).
 *   4. Start health server on TENDERS_INGEST_HEALTH_PORT.
 *   5. Register cron tasks (one per enabled source).
 *   6. Graceful shutdown on SIGTERM / SIGINT — abort in-flight ticks,
 *      stop cron, close health server, exit 0.
 */

import { loadConfig } from './config.ts'
import { createLogger } from './observability/logger.ts'
import { MetricsRegistry } from './observability/metrics.ts'
import { SecretsResolver } from './secrets-resolver.ts'
import { Publisher } from './core/publisher.ts'
import { InMemoryCursorStore } from './core/cursor.ts'
import { runPipeline } from './core/pipeline.ts'
import { SOURCE_REGISTRY, buildSource } from './sources/registry.ts'
import { startCron } from './cron.ts'
import { startHealthServer } from './health-server.ts'
import type {
  Source,
  SourceConfig,
  SourceHealthStatus,
  SourceId,
} from '~/shared/types/tenders-ingest.ts'

async function main(): Promise<void> {
  const cfg = loadConfig()
  const startedAt = new Date()
  const logger = createLogger({
    level: cfg.logLevel,
    base: { service: 'tenders-ingest' },
  })
  logger.info('boot.start', {
    mainAppUrl: cfg.mainAppUrl,
    healthPort: cfg.healthPort,
    logLevel: cfg.logLevel,
  })

  const metrics = new MetricsRegistry()
  const cursorStore = new InMemoryCursorStore()
  const secretsResolver = new SecretsResolver({
    mainAppUrl: cfg.mainAppUrl,
    serviceToken: cfg.serviceToken,
    logger: logger.child({ component: 'secrets-resolver' }),
  })
  const publisher = new Publisher({
    mainAppUrl: cfg.mainAppUrl,
    serviceToken: cfg.serviceToken,
  })

  // === Build sources from registry =========================================
  const built: Array<{
    config: SourceConfig
    source: Source
    status: SourceHealthStatus
  }> = []

  for (const sourceCfg of SOURCE_REGISTRY) {
    // Honor service-level env toggles in addition to the registry's
    // declarative `enabled` flag — operators can disable a working
    // source without code changes.
    const envEnabled = isEnvEnabled(sourceCfg.id, cfg)
    if (!envEnabled || !sourceCfg.enabled) {
      built.push({
        config: sourceCfg,
        source: dummySource(sourceCfg),
        status: 'disabled',
      })
      continue
    }
    const overrideBaseUrl = envBaseUrl(sourceCfg.id, cfg)
    const overrideSchedule = envSchedule(sourceCfg.id, cfg)
    const effectiveCfg: SourceConfig = {
      ...sourceCfg,
      schedule: overrideSchedule ?? sourceCfg.schedule,
      transport: overrideBaseUrl
        ? withBaseUrl(sourceCfg.transport, overrideBaseUrl)
        : sourceCfg.transport,
    }

    const { source, status } = await buildSource(effectiveCfg, {
      logger,
      resolveSecret: (ref) => secretsResolver.resolve(ref),
    })
    built.push({ config: effectiveCfg, source, status })
    logger.info('source.built', { sourceId: source.id, status })
  }

  // === Health server ========================================================
  const statuses: Record<SourceId, SourceHealthStatus> = {} as Record<SourceId, SourceHealthStatus>
  for (const b of built) {
    statuses[b.config.id] = b.status
  }
  const healthHandle = await startHealthServer({
    port: cfg.healthPort,
    startedAt,
    getStatuses: () => ({ ...statuses }),
    metrics,
    logger: logger.child({ component: 'health' }),
  })

  // === Cron tasks ===========================================================
  const abortController = new AbortController()
  const cronHandle = startCron(
    built
      .filter((b) => b.status === 'ok' || b.status === 'degraded:no-secret')
      .map((b) => ({
        name: b.config.id,
        expression: b.config.schedule,
        task: async () => {
          try {
            await runPipeline({
              source: b.source,
              cursorStore,
              publisher,
              logger,
              metrics,
              signal: abortController.signal,
            })
            // Refresh status: a previously degraded source becomes ok if
            // the pipeline ran without throwing — but only if the secret
            // was present. The zakupki source itself yields zero items
            // when the token is missing, so we keep the original status.
          } catch (err) {
            statuses[b.config.id] = {
              kind: 'failed',
              reason: err instanceof Error ? err.message : String(err),
            }
            logger.error('cron.task.failed', {
              sourceId: b.config.id,
              err: err instanceof Error ? err.message : String(err),
            })
          }
        },
      })),
    (err, task) => {
      logger.error('cron.scheduler.error', {
        task: task.name,
        err: err instanceof Error ? err.message : String(err),
      })
    },
  )

  logger.info('boot.ready', {
    enabledSources: built
      .filter((b) => b.status !== 'disabled')
      .map((b) => b.config.id),
  })

  // === Graceful shutdown ====================================================
  let shuttingDown = false
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    logger.info('shutdown.start', { signal })
    abortController.abort()
    cronHandle.stop()
    await healthHandle.close()
    logger.info('shutdown.complete', {})
    process.exit(0)
  }
  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

// === Env-driven overrides ====================================================

type CfgT = ReturnType<typeof loadConfig>

function isEnvEnabled(id: SourceId, cfg: CfgT): boolean {
  switch (id) {
    case 'zakupki':
      return cfg.sources.zakupki.enabled
    case 'torgi':
      return cfg.sources.torgi.enabled
    default:
      // Registry placeholders ignore env.
      return true
  }
}

function envBaseUrl(id: SourceId, cfg: CfgT): string | null {
  switch (id) {
    case 'zakupki':
      return cfg.sources.zakupki.baseUrl
    case 'torgi':
      return cfg.sources.torgi.baseUrl
    default:
      return null
  }
}

function envSchedule(id: SourceId, cfg: CfgT): string | null {
  switch (id) {
    case 'zakupki':
      return cfg.sources.zakupki.cron
    case 'torgi':
      return cfg.sources.torgi.cron
    default:
      return null
  }
}

function withBaseUrl<T extends { kind: string }>(
  transport: T,
  baseUrl: string,
): T {
  if ('baseUrl' in transport) {
    return { ...transport, baseUrl }
  }
  if ('entryUrl' in transport) {
    return { ...transport, entryUrl: baseUrl }
  }
  if ('url' in transport) {
    return { ...transport, url: baseUrl }
  }
  return transport
}

function dummySource(cfg: SourceConfig): Source {
  return {
    id: cfg.id,
    schedule: cfg.schedule,
    // eslint-disable-next-line require-yield
    async *fetchBatch() {
      return
    },
    parseItem: () => null,
    serializeCursor: () => null,
  }
}

// === Boot ====================================================================

main().catch((err) => {
  process.stderr.write(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'error',
      event: 'boot.failed',
      service: 'tenders-ingest',
      err: err instanceof Error ? err.message : String(err),
    }) + '\n',
  )
  process.exit(1)
})
