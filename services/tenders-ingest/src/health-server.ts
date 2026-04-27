/**
 * Tiny HTTP health endpoint for PM2 / docker healthchecks.
 *
 * Exposes:
 *   GET /health  — `{ sources, startedAt, uptimeSeconds, metrics }`
 *
 * Uses `node:http` directly — no h3, no framework, no external deps.
 */

import { createServer, type Server } from 'node:http'
import type { IngestHealth, SourceHealthStatus, SourceId } from '~/shared/types/tenders-ingest.ts'
import type { MetricsRegistry } from './observability/metrics.ts'
import type { Logger } from './observability/logger.ts'

export interface HealthServerOptions {
  port: number
  startedAt: Date
  getStatuses: () => Record<SourceId, SourceHealthStatus>
  metrics: MetricsRegistry
  logger: Logger
}

export interface HealthServerHandle {
  close: () => Promise<void>
}

export function startHealthServer(opts: HealthServerOptions): Promise<HealthServerHandle> {
  return new Promise((resolve) => {
    const server: Server = createServer((req, res) => {
      if (req.method !== 'GET' || !req.url) {
        res.statusCode = 404
        res.end()
        return
      }
      if (req.url === '/health') {
        const health: IngestHealth & { metrics: ReturnType<MetricsRegistry['snapshot']> } = {
          sources: opts.getStatuses() as unknown as Record<string, SourceHealthStatus>,
          startedAt: opts.startedAt.toISOString(),
          uptimeSeconds: Math.floor(
            (Date.now() - opts.startedAt.getTime()) / 1000,
          ),
          metrics: opts.metrics.snapshot(),
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(health))
        return
      }
      res.statusCode = 404
      res.end()
    })
    server.listen(opts.port, () => {
      opts.logger.info('health.listening', { port: opts.port })
      resolve({
        close: () =>
          new Promise<void>((done) => {
            server.close(() => done())
          }),
      })
    })
  })
}
