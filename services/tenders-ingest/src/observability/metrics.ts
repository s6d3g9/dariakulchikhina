/**
 * Per-source counters surfaced by the /health endpoint.
 *
 * Atomic per-tick reset semantics: each cron run resets counters for
 * that source, then mutates them as the pipeline progresses. The
 * `snapshot` is what the /health endpoint and the dashboard consume.
 */

import type { SourceId } from '~/shared/types/tenders-ingest.ts'

export interface SourceMetrics {
  processed: number
  matched: number
  dropped: number
  errors: number
  lastRunAt: string | null
  lastDurationMs: number | null
}

export interface MetricsSnapshot {
  sources: Record<string, SourceMetrics>
}

const initial = (): SourceMetrics => ({
  processed: 0,
  matched: 0,
  dropped: 0,
  errors: 0,
  lastRunAt: null,
  lastDurationMs: null,
})

export class MetricsRegistry {
  private readonly sources = new Map<SourceId, SourceMetrics>()

  ensure(sourceId: SourceId): SourceMetrics {
    let m = this.sources.get(sourceId)
    if (!m) {
      m = initial()
      this.sources.set(sourceId, m)
    }
    return m
  }

  resetForRun(sourceId: SourceId): void {
    this.sources.set(sourceId, initial())
  }

  recordProcessed(sourceId: SourceId, n = 1): void {
    this.ensure(sourceId).processed += n
  }

  recordMatched(sourceId: SourceId, n = 1): void {
    this.ensure(sourceId).matched += n
  }

  recordDropped(sourceId: SourceId, n = 1): void {
    this.ensure(sourceId).dropped += n
  }

  recordError(sourceId: SourceId, n = 1): void {
    this.ensure(sourceId).errors += n
  }

  recordRunCompleted(sourceId: SourceId, durationMs: number): void {
    const m = this.ensure(sourceId)
    m.lastRunAt = new Date().toISOString()
    m.lastDurationMs = durationMs
  }

  snapshot(): MetricsSnapshot {
    const out: Record<string, SourceMetrics> = {}
    for (const [id, m] of this.sources) {
      out[id] = { ...m }
    }
    return { sources: out }
  }
}
