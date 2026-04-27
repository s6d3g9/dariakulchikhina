/**
 * Unit tests for server/utils/service-token-auth.ts.
 *
 * Usage:
 *   node --experimental-strip-types --import=./tilde-register.mjs \
 *     server/utils/__tests__/service-token-auth.test.ts
 */

import * as assert from 'node:assert/strict'
import {
  constantTimeEqual,
  requireServiceToken,
} from '../service-token-auth'

// Minimal H3Event mock — only the bits requireServiceToken touches.
// h3 v2's getHeader() expects `event.req.headers` to be a Headers instance.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mockEvent(headers: Record<string, string> = {}): any {
  return {
    req: { headers: new Headers(headers) },
    res: {},
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

  // === constantTimeEqual ===================================================
  await test('constantTimeEqual: equal strings', async () => {
    assert.equal(constantTimeEqual('abc123', 'abc123'), true)
  })
  await test('constantTimeEqual: different content same length', async () => {
    assert.equal(constantTimeEqual('abc123', 'abc124'), false)
  })
  await test('constantTimeEqual: different lengths', async () => {
    assert.equal(constantTimeEqual('abc', 'abc1'), false)
  })
  await test('constantTimeEqual: empty vs non-empty', async () => {
    assert.equal(constantTimeEqual('', 'a'), false)
    assert.equal(constantTimeEqual('', ''), true)
  })

  // === requireServiceToken =================================================
  const opts = {
    envVarName: 'TEST_SVC_TOKEN_AUTH',
    disabledStatusMessage: 'TEST_DISABLED',
    disabledCode: 'TEST_DISABLED',
  }

  await test('503 when env var missing', async () => {
    delete process.env[opts.envVarName]
    let caught: any = null
    try {
      requireServiceToken(mockEvent({ authorization: 'Bearer x' }), opts)
    } catch (e) {
      caught = e
    }
    assert.ok(caught, 'expected to throw')
    assert.equal(caught.statusCode, 503)
  })

  await test('401 with no auth header', async () => {
    process.env[opts.envVarName] = 'expected-token'
    let caught: any = null
    try {
      requireServiceToken(mockEvent({}), opts)
    } catch (e) {
      caught = e
    }
    assert.ok(caught)
    assert.equal(caught.statusCode, 401)
  })

  await test('401 with wrong Bearer token', async () => {
    process.env[opts.envVarName] = 'expected-token'
    let caught: any = null
    try {
      requireServiceToken(
        mockEvent({ authorization: 'Bearer wrong-tokenz' }),
        opts,
      )
    } catch (e) {
      caught = e
    }
    assert.ok(caught)
    assert.equal(caught.statusCode, 401)
  })

  await test('401 with token differing by 1 char', async () => {
    process.env[opts.envVarName] = 'expected-token'
    let caught: any = null
    try {
      requireServiceToken(
        mockEvent({ authorization: 'Bearer expected-tokeN' }),
        opts,
      )
    } catch (e) {
      caught = e
    }
    assert.ok(caught)
    assert.equal(caught.statusCode, 401)
  })

  await test('401 with empty Bearer', async () => {
    process.env[opts.envVarName] = 'expected-token'
    let caught: any = null
    try {
      requireServiceToken(mockEvent({ authorization: 'Bearer ' }), opts)
    } catch (e) {
      caught = e
    }
    assert.ok(caught)
    assert.equal(caught.statusCode, 401)
  })

  await test('200 (no throw) with correct Bearer token', async () => {
    process.env[opts.envVarName] = 'expected-token'
    requireServiceToken(
      mockEvent({ authorization: 'Bearer expected-token' }),
      opts,
    )
  })

  await test('200 (no throw) with x-service-token legacy header', async () => {
    process.env[opts.envVarName] = 'expected-token'
    requireServiceToken(
      mockEvent({ 'x-service-token': 'expected-token' }),
      opts,
    )
  })

  // Cleanup
  delete process.env[opts.envVarName]

  console.log(`\nservice-token-auth.test: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch((err) => {
  console.error('TEST RUNNER FAILED:', err)
  process.exit(1)
})
