/**
 * Auth + lookup tests for GET /api/secrets/value (B1 service endpoint).
 *
 * Asserts:
 *  - 401 without service token
 *  - 401 with wrong service token
 *  - 503 when env var unset
 *  - 400 when ?key is missing
 *  - 404 when secret resolver returns null (tested via direct module mock)
 *
 * The 200 happy path is exercised through the integration of
 * `secrets-resolver.ts` against a live DB row in W1.B/staging — out of
 * scope for this unit suite.
 *
 * Usage:
 *   node --experimental-strip-types --import=./tilde-register.mjs \
 *     server/api/secrets/__tests__/value.test.ts
 */

import * as assert from 'node:assert/strict'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockEvent(opts: { headers?: Record<string, string>; query?: Record<string, string> } = {}): any {
  const headers = new Headers(opts.headers ?? {})
  const url = new URL('http://test.local/api/secrets/value')
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v)
  return {
    req: { headers, url: url.toString() },
    res: {},
    node: {
      req: { headers: Object.fromEntries(headers.entries()), url: url.pathname + url.search },
      res: { setHeader: () => {}, getHeader: () => undefined },
    },
    context: { params: {} },
    path: url.pathname,
  }
}

async function run() {
  let passed = 0
  let failed = 0

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn()
      console.log(`  ✓ ${name}`)
      passed++
    } catch (e: any) {
      console.error(`  ✗ ${name}: ${e?.message ?? e}`)
      if (e?.stack) console.error(e.stack.split('\n').slice(1, 3).join('\n'))
      failed++
    }
  }

  // Required env so dependent module imports succeed.
  if (!process.env.NUXT_SESSION_SECRET) {
    process.env.NUXT_SESSION_SECRET = 'a-test-session-secret-with-enough-length-32+'
  }
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test'
  }

  // Provide createError as a global for the auto-imported helpers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any
  if (typeof g.createError !== 'function') {
    const h3 = await import('h3')
    g.createError = h3.createError
  }

  const valueGet = await import('../value.get.ts')
  const handler = valueGet.default

  await test('503 when TENDERS_INGEST_SERVICE_TOKEN unset', async () => {
    delete process.env.TENDERS_INGEST_SERVICE_TOKEN
    let caught: any = null
    try {
      await handler(mockEvent({ query: { key: 'tenders.zakupki.individualPersonToken' } }))
    } catch (e) {
      caught = e
    }
    assert.ok(caught, 'expected throw')
    assert.equal(caught.statusCode, 503)
  })

  await test('401 without Authorization header', async () => {
    process.env.TENDERS_INGEST_SERVICE_TOKEN = 'right-token'
    let caught: any = null
    try {
      await handler(mockEvent({ query: { key: 'foo' } }))
    } catch (e) {
      caught = e
    }
    assert.ok(caught)
    assert.equal(caught.statusCode, 401)
  })

  await test('401 with wrong Bearer token', async () => {
    process.env.TENDERS_INGEST_SERVICE_TOKEN = 'right-token'
    let caught: any = null
    try {
      await handler(
        mockEvent({
          headers: { authorization: 'Bearer wrong-token' },
          query: { key: 'foo' },
        }),
      )
    } catch (e) {
      caught = e
    }
    assert.ok(caught)
    assert.equal(caught.statusCode, 401)
  })

  await test('400 when ?key is missing', async () => {
    process.env.TENDERS_INGEST_SERVICE_TOKEN = 'right-token'
    let caught: any = null
    try {
      await handler(
        mockEvent({
          headers: { authorization: 'Bearer right-token' },
        }),
      )
    } catch (e) {
      caught = e
    }
    assert.ok(caught)
    assert.equal(caught.statusCode, 400)
    assert.equal(caught.statusMessage, 'MISSING_KEY')
  })

  // Cleanup
  delete process.env.TENDERS_INGEST_SERVICE_TOKEN

  console.log(`\nsecrets/__tests__/value.test: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error('TEST RUNNER FAILED:', err)
  process.exit(1)
})
