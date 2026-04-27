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

/**
 * Classification test — `parseItem` throw vs `null` return must map to
 * `recordError` vs `recordDropped` respectively. Guards the contract
 * after the W1.A.fix2 zakupki refactor: parse failures throw (so the
 * pipeline classifies them as errors), filter rejects return null.
 */
class ControllableSource implements Source<string> {
  readonly id = 'torgi' as const
  readonly schedule = '* * * * *'
  private readonly raws: string[]
  private readonly behavior: (raw: string) => UnifiedTender | null
  constructor(
    raws: string[],
    behavior: (raw: string) => UnifiedTender | null,
  ) {
    this.raws = raws
    this.behavior = behavior
  }
  async *fetchBatch(): AsyncIterable<string> {
    for (const r of this.raws) yield r
  }
  parseItem(raw: string): UnifiedTender | null {
    return this.behavior(raw)
  }
  serializeCursor(): SourceCursor | null {
    return null
  }
}

async function noopFetch(): Promise<Response> {
  return new Response(JSON.stringify({ inserted: 0, updated: 0, skipped: 0 }), {
    status: 200,
  })
}

export async function runPipelineClassificationTests(): Promise<void> {
  const logger = createLogger({ level: 'warn' })
  const publisher = new Publisher({
    mainAppUrl: 'http://localhost:9999',
    serviceToken: 'test-token',
    fetchImpl: noopFetch as unknown as typeof fetch,
  })

  // Case 1: parseItem throws → recordError++, recordDropped not incremented.
  {
    const metrics = new MetricsRegistry()
    const source = new ControllableSource(['x'], () => {
      throw new Error('parse boom')
    })
    const result = await runPipeline({
      source,
      cursorStore: new InMemoryCursorStore(),
      publisher,
      logger,
      metrics,
      signal: new AbortController().signal,
      batchSize: 10,
    })
    assert.equal(result.processed, 1, 'throw: processed')
    assert.equal(result.errors, 1, 'throw: errors=1')
    assert.equal(result.dropped, 0, 'throw: dropped=0')
    assert.equal(result.matched, 0, 'throw: matched=0')
    const snap = metrics.snapshot()
    assert.equal(snap.sources.torgi!.errors, 1, 'throw: metric errors=1')
    assert.equal(snap.sources.torgi!.dropped, 0, 'throw: metric dropped=0')
  }

  // Case 2: parseItem returns null → recordDropped++, recordError not incremented.
  {
    const metrics = new MetricsRegistry()
    const source = new ControllableSource(['y'], () => null)
    const result = await runPipeline({
      source,
      cursorStore: new InMemoryCursorStore(),
      publisher,
      logger,
      metrics,
      signal: new AbortController().signal,
      batchSize: 10,
    })
    assert.equal(result.processed, 1, 'null: processed')
    assert.equal(result.errors, 0, 'null: errors=0')
    assert.equal(result.dropped, 1, 'null: dropped=1')
    assert.equal(result.matched, 0, 'null: matched=0')
    const snap = metrics.snapshot()
    assert.equal(snap.sources.torgi!.errors, 0, 'null: metric errors=0')
    assert.equal(snap.sources.torgi!.dropped, 1, 'null: metric dropped=1')
  }

  console.log('pipeline.classification.test ok')
}
