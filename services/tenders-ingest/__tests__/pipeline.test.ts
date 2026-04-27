/**
 * Pipeline integration test — exercises the full fetch → parse → filter
 * → publish loop with a mock source and a mock publisher (no network).
 *
 * Asserts:
 *  - matched items reach the publisher,
 *  - filtered-out items are dropped,
 *  - publisher receives idempotency-key,
 *  - cursor is saved on success.
 */
import assert from 'node:assert/strict'
import { runPipeline } from '../src/core/pipeline.ts'
import { Publisher } from '../src/core/publisher.ts'
import { InMemoryCursorStore } from '../src/core/cursor.ts'
import { createLogger } from '../src/observability/logger.ts'
import { MetricsRegistry } from '../src/observability/metrics.ts'
import type {
  Source,
  SourceCursor,
  UnifiedTender,
} from '../src/core/source.ts'

function makeTender(over: Partial<UnifiedTender>): UnifiedTender {
  return {
    sourceId: 'torgi',
    externalGuid: 'g1',
    procedureType: 'AUCTION',
    law: 'imushestvo',
    publishedAt: '2026-04-26T08:00:00Z',
    customer: {
      inn: '7707083893',
      name: 'Test',
      region: 'RU-MOW',
    },
    title: 't',
    okpd2: ['42.11.10.110'],
    startPrice: 1,
    currency: 'RUB',
    deadlineAt: null,
    documentsUrls: [],
    rawPayloadHash: 'h'.repeat(64),
    rawPayload: {},
    ...over,
  }
}

class MockSource implements Source<UnifiedTender> {
  readonly id = 'torgi' as const
  readonly schedule = '* * * * *'
  private readonly items: UnifiedTender[]
  constructor(items: UnifiedTender[]) {
    this.items = items
  }
  async *fetchBatch(): AsyncIterable<UnifiedTender> {
    for (const i of this.items) yield i
  }
  parseItem(raw: UnifiedTender): UnifiedTender { return raw }
  serializeCursor(): SourceCursor | null {
    return { sourceId: 'torgi', value: 'c1', updatedAt: new Date().toISOString() }
  }
}

export async function runPipelineTests(): Promise<void> {
  // Mock fetch to capture publisher calls without network.
  const calls: Array<{ url: string; body: unknown; idempotencyKey: string }> = []
  const mockFetch: typeof fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    const body = JSON.parse((init?.body as string) ?? '{}')
    const idempotencyKey = (init?.headers as Record<string, string>)['Idempotency-Key']
    calls.push({ url, body, idempotencyKey })
    return new Response(
      JSON.stringify({ inserted: body.items.length, updated: 0, skipped: 0 }),
      { status: 200 },
    )
  }

  const items = [
    makeTender({ externalGuid: 'g1' }), // pass
    makeTender({ externalGuid: 'g2', okpd2: ['99.99.99'] }), // dropped (okpd)
    makeTender({ externalGuid: 'g3', customer: { inn: '1', name: 'x', region: 'RU-NIZ' } }), // dropped (region)
    makeTender({ externalGuid: 'g1' }), // dropped (dedup)
    makeTender({ externalGuid: 'g4' }), // pass
  ]

  const cursorStore = new InMemoryCursorStore()
  const publisher = new Publisher({
    mainAppUrl: 'http://localhost:9999',
    serviceToken: 'test-token',
    fetchImpl: mockFetch,
  })
  const logger = createLogger({ level: 'warn' })
  const metrics = new MetricsRegistry()

  const result = await runPipeline({
    source: new MockSource(items),
    cursorStore,
    publisher,
    logger,
    metrics,
    signal: new AbortController().signal,
    batchSize: 10,
  })

  assert.equal(result.processed, 5, 'processed')
  assert.equal(result.matched, 2, 'matched (g1, g4)')
  assert.equal(result.dropped, 3, 'dropped (okpd, region, dedup)')
  assert.equal(result.errors, 0, 'no errors')
  assert.equal(result.inserted, 2, 'publisher reported inserted=2')

  assert.equal(calls.length, 1, 'one publisher batch')
  assert.ok(calls[0]!.idempotencyKey.startsWith('torgi:'), 'idempotency-key prefixed with sourceId')

  const saved = await cursorStore.load('torgi')
  assert.ok(saved, 'cursor saved')
  assert.equal(saved.value, 'c1')

  // Metrics
  const snap = metrics.snapshot()
  assert.equal(snap.sources.torgi!.matched, 2)
  assert.equal(snap.sources.torgi!.dropped, 3)
  assert.equal(snap.sources.torgi!.processed, 5)

  console.log('pipeline.test ok')
}
