/**
 * Unified pipeline: fetch → parse → filter → dedup → publish → checkpoint.
 *
 * The same function runs all sources — adapters differ only in their
 * fetch/parse implementations. Sources opt into filters via
 * `SourceConfig.filters`; the default cityofroads-MVP whitelist is
 * applied unless explicitly disabled.
 *
 * Errors per item are isolated: a parse failure on one raw payload
 * counts as a `dropped`/`error` in metrics but doesn't abort the run.
 * Errors at the publisher (network/main-app down) propagate up — the
 * cron scheduler decides when to retry next tick.
 */

import type { Source, SourceCursor, UnifiedTender } from './source.ts'
import { SeenSet } from './dedup.ts'
import {
  CITYOFROADS_OKPD2_WHITELIST,
  matchesOkpd2Whitelist,
} from './filter/okpd.ts'
import {
  CITYOFROADS_REGIONS_ISO,
  matchesRegionWhitelist,
} from './filter/region.ts'
import type { CursorStore } from './cursor.ts'
import type { Publisher } from './publisher.ts'
import type { Logger } from '../observability/logger.ts'
import type { MetricsRegistry } from '../observability/metrics.ts'

export interface PipelineOptions {
  source: Source
  cursorStore: CursorStore
  publisher: Publisher
  logger: Logger
  metrics: MetricsRegistry
  signal: AbortSignal
  /** Optional override; defaults to the cityofroads MVP scope. */
  okpd2Whitelist?: readonly string[]
  regionWhitelist?: readonly string[]
  /** Items per HTTP POST to the main app. Default 200. */
  batchSize?: number
}

export interface PipelineResult {
  processed: number
  matched: number
  dropped: number
  errors: number
  inserted: number
  updated: number
  skipped: number
}

/**
 * Run one full pipeline tick for a single source. Returns aggregate
 * counters (also recorded in `metrics`).
 */
export async function runPipeline(
  opts: PipelineOptions,
): Promise<PipelineResult> {
  const startedAt = Date.now()
  const tickKey = new Date(startedAt).toISOString()
  const log = opts.logger.child({ sourceId: opts.source.id })
  const seen = new SeenSet()
  const okpd2 = opts.okpd2Whitelist ?? CITYOFROADS_OKPD2_WHITELIST
  const regions = opts.regionWhitelist ?? CITYOFROADS_REGIONS_ISO
  const batchSize = opts.batchSize ?? 200

  opts.metrics.resetForRun(opts.source.id)
  log.info('pipeline.start', { tickKey })

  const cursor = await opts.cursorStore.load(opts.source.id)
  const result: PipelineResult = {
    processed: 0,
    matched: 0,
    dropped: 0,
    errors: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
  }

  let buffer: UnifiedTender[] = []
  let batchIndex = 0

  const flush = async (): Promise<void> => {
    if (buffer.length === 0) return
    // Deterministic key: does not depend on result.processed (which
    // changes as items are counted), only on source, tick, and batch
    // number. Identical re-runs produce identical keys → true idempotency.
    const idempotencyKey = `${opts.source.id}:${tickKey}:${batchIndex}`
    batchIndex += 1
    const r = await opts.publisher.publish(
      opts.source.id,
      buffer,
      idempotencyKey,
    )
    result.inserted += r.inserted
    result.updated += r.updated
    result.skipped += r.skipped
    log.info('pipeline.batch.published', {
      size: buffer.length,
      inserted: r.inserted,
      updated: r.updated,
      skipped: r.skipped,
    })
    buffer = []
  }

  try {
    for await (const raw of opts.source.fetchBatch(cursor, opts.signal)) {
      if (opts.signal.aborted) {
        log.warn('pipeline.aborted', { processed: result.processed })
        break
      }

      result.processed += 1
      opts.metrics.recordProcessed(opts.source.id)

      let parsed: UnifiedTender | null
      try {
        parsed = opts.source.parseItem(raw)
      } catch (err) {
        result.errors += 1
        opts.metrics.recordError(opts.source.id)
        log.warn('pipeline.parse.failed', {
          err: errMsg(err),
        })
        continue
      }

      if (!parsed) {
        result.dropped += 1
        opts.metrics.recordDropped(opts.source.id)
        continue
      }

      if (!matchesOkpd2Whitelist(parsed.okpd2, okpd2)) {
        result.dropped += 1
        opts.metrics.recordDropped(opts.source.id)
        continue
      }
      if (!matchesRegionWhitelist(parsed.customer.region, regions)) {
        result.dropped += 1
        opts.metrics.recordDropped(opts.source.id)
        continue
      }
      if (!seen.add(parsed.sourceId, parsed.externalGuid)) {
        result.dropped += 1
        opts.metrics.recordDropped(opts.source.id)
        continue
      }

      result.matched += 1
      opts.metrics.recordMatched(opts.source.id)
      buffer.push(parsed)
      if (buffer.length >= batchSize) {
        await flush()
      }
    }
    await flush()

    // Persist cursor only when there is something to advance.
    // Skip when nothing matched AND there was no incoming cursor — an
    // empty run on a fresh source should not write a blank cursor that
    // would overwrite a real one stored from a prior non-empty run.
    const next: SourceCursor | null =
      result.matched === 0 && cursor === null
        ? null
        : opts.source.serializeCursor({})
    if (next !== null) {
      await opts.cursorStore.save(next)
    }

    const durationMs = Date.now() - startedAt
    opts.metrics.recordRunCompleted(opts.source.id, durationMs)
    log.info('pipeline.complete', {
      durationMs,
      ...result,
    })
    return result
  } catch (err) {
    const durationMs = Date.now() - startedAt
    opts.metrics.recordError(opts.source.id)
    opts.metrics.recordRunCompleted(opts.source.id, durationMs)
    log.error('pipeline.failed', {
      err: errMsg(err),
      durationMs,
      processed: result.processed,
    })
    throw err
  }
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
