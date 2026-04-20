/**
 * Unit tests for server/utils/define-endpoint.ts.
 *
 * Usage:
 *   node --experimental-strip-types server/utils/__tests__/define-endpoint.test.ts
 */

import * as assert from 'node:assert/strict'
import { z } from 'zod'
import { NotFoundError } from '../errors'
import { defineEndpoint } from '../define-endpoint'
import type { Session } from '../define-endpoint'

// Minimal H3Event mock. Mirrors the shapes accessed by defineEndpoint internals.
function mockEvent(opts: {
  body?: unknown
  params?: Record<string, string>
  queryString?: string
} = {}): any {
  const path = '/api/test' + (opts.queryString ? `?${opts.queryString}` : '')
  return {
    path,
    node: {
      req: { url: path, headers: {}, _body: opts.body ?? {} },
      res: {},
    },
    context: { params: opts.params ?? {} },
  }
}

const adminSession: Session = { role: 'admin', id: 1, email: 'admin@test.com', name: null }

function mockSession(s: Session | null) {
  return async (_event: any): Promise<Session | null> => s
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

  // 1. Happy path — input valid, auth ok
  await test('happy path: input valid, auth ok', async () => {
    const handler = defineEndpoint({
      auth: 'required',
      input: z.object({ name: z.string() }),
      _resolveSession: mockSession(adminSession),
      async handler({ session, input }) {
        assert.equal(session?.role, 'admin')
        assert.equal((input as any).name, 'hello')
        return { ok: true }
      },
    })
    const result = await (handler as any)(mockEvent({ body: { name: 'hello' } }))
    assert.deepEqual(result, { ok: true })
  })

  // 2. Auth required + no session → 401
  await test('auth required, no session → 401', async () => {
    const handler = defineEndpoint({
      auth: 'required',
      _resolveSession: mockSession(null),
      async handler() { return {} },
    })
    try {
      await (handler as any)(mockEvent())
      assert.fail('Expected 401 error to be thrown')
    } catch (e: any) {
      assert.equal(e.statusCode, 401, `Expected statusCode 401, got ${e.statusCode}: ${e.message}`)
    }
  })

  // 3. Input invalid → 400 VALIDATION_FAILED
  await test('invalid input → 400 VALIDATION_FAILED', async () => {
    const handler = defineEndpoint({
      auth: 'none',
      input: z.object({ count: z.number() }),
      async handler() { return {} },
    })
    try {
      await (handler as any)(mockEvent({ body: { count: 'not-a-number' } }))
      assert.fail('Expected 400 error to be thrown')
    } catch (e: any) {
      assert.equal(e.statusCode, 400, `Expected statusCode 400, got ${e.statusCode}`)
      assert.equal(e.statusMessage, 'VALIDATION_FAILED', `Expected VALIDATION_FAILED, got ${e.statusMessage}`)
    }
  })

  // 4. Handler throws NotFoundError → 404 NOT_FOUND
  await test('NotFoundError → 404 NOT_FOUND', async () => {
    const handler = defineEndpoint({
      auth: 'none',
      async handler() {
        throw new NotFoundError('Item', 42)
      },
    })
    try {
      await (handler as any)(mockEvent())
      assert.fail('Expected 404 error to be thrown')
    } catch (e: any) {
      assert.equal(e.statusCode, 404, `Expected statusCode 404, got ${e.statusCode}`)
      assert.equal(e.statusMessage, 'NOT_FOUND', `Expected NOT_FOUND, got ${e.statusMessage}`)
    }
  })

  const total = passed + failed
  console.log(`\n${passed}/${total} passed${failed > 0 ? `, ${failed} failed` : ''}`)
  if (failed > 0) process.exit(1)
}

run().catch((e) => {
  console.error('Test runner error:', e)
  process.exit(1)
})
