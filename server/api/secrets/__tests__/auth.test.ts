/**
 * Auth smoke tests for /api/secrets handlers.
 *
 * Asserts that the three CRUD endpoints (GET/POST list, DELETE one) all
 * call `requireAdmin(event)` and surface 401 when no admin session is
 * present. These endpoints encrypt/decrypt sensitive data — they MUST
 * never be reachable without an authenticated admin.
 *
 * Note: `/api/secrets/value` (B1) is intentionally excluded — it uses
 * service-token auth instead (different threat model). See its own
 * test file.
 *
 * Usage:
 *   node --experimental-strip-types --import=./tilde-register.mjs \
 *     server/api/secrets/__tests__/auth.test.ts
 */

import * as assert from 'node:assert/strict'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockEvent(opts: { headers?: Record<string, string>; body?: unknown; routerParams?: Record<string, string>; query?: Record<string, string> } = {}): any {
  const headers = new Headers(opts.headers ?? {})
  const url = new URL('http://test.local/api/secrets')
  for (const [k, v] of Object.entries(opts.query ?? {})) url.searchParams.set(k, v)
  const node = {
    req: { headers: Object.fromEntries(headers.entries()), url: url.pathname + url.search, method: 'GET' },
    res: { setHeader: () => {}, getHeader: () => undefined },
  }
  return {
    req: { headers, url: url.toString(), _readBody: opts.body },
    res: {},
    node,
    context: { params: opts.routerParams ?? {} },
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

  // `createError` is a Nuxt auto-import — provide it as a global for tests
  // so the production-time `requireAdmin` helper resolves the symbol.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any
  if (typeof g.createError !== 'function') {
    const h3 = await import('h3')
    g.createError = h3.createError
  }

  const indexGet = await import('../index.get.ts')
  const indexPost = await import('../index.post.ts')
  const idDelete = await import('../[id].delete.ts')

  // We cannot easily call the H3 handler without a full event, so we
  // assert on the auth gate by invoking the handler and expecting a
  // 401 createError throw. Each handler is a defineEventHandler, which
  // wraps a function in `.handler` for h3 v2.
  async function callHandler(mod: { default: any }, evt: any): Promise<any> {
    const h = mod.default
    const fn = typeof h === 'function' ? h : (h.handler ?? h.__handler ?? h)
    return await fn(evt)
  }

  await test('GET /api/secrets requires admin (401 without cookie)', async () => {
    let caught: any = null
    try {
      await callHandler(indexGet, mockEvent({ query: { scope: 'global' } }))
    } catch (e) {
      caught = e
    }
    assert.ok(caught, 'expected handler to throw')
    assert.equal(caught.statusCode, 401)
  })

  await test('POST /api/secrets requires admin (401 without cookie)', async () => {
    let caught: any = null
    try {
      await callHandler(
        indexPost,
        mockEvent({
          body: { scope: 'global', key: 'k', value: 'v' },
        }),
      )
    } catch (e) {
      caught = e
    }
    assert.ok(caught, 'expected handler to throw')
    assert.equal(caught.statusCode, 401)
  })

  await test('DELETE /api/secrets/:id requires admin (401 without cookie)', async () => {
    let caught: any = null
    try {
      await callHandler(
        idDelete,
        mockEvent({ routerParams: { id: '00000000-0000-0000-0000-000000000000' } }),
      )
    } catch (e) {
      caught = e
    }
    assert.ok(caught, 'expected handler to throw')
    assert.equal(caught.statusCode, 401)
  })

  console.log(`\nsecrets/__tests__/auth.test: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error('TEST RUNNER FAILED:', err)
  process.exit(1)
})
