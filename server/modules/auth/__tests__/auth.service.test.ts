/**
 * Smoke tests for server/modules/auth password helpers.
 * Validates hash + verify round-trip without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types \
 *     server/modules/auth/__tests__/auth.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword, verifyPassword } from '../password.service.ts'

describe('auth.service (password)', () => {
  it('hashPassword returns a bcrypt hash string', async () => {
    const hash = await hashPassword('s3cr3t')
    assert.ok(typeof hash === 'string')
    assert.ok(hash.startsWith('$2'), 'bcrypt hashes start with $2')
    assert.ok(hash.length > 20)
  })

  it('verifyPassword returns true for the correct plaintext', async () => {
    const hash = await hashPassword('correct-horse')
    assert.equal(await verifyPassword('correct-horse', hash), true)
  })

  it('verifyPassword returns false for a wrong password', async () => {
    const hash = await hashPassword('correct-horse')
    assert.equal(await verifyPassword('wrong-password', hash), false)
  })
})
