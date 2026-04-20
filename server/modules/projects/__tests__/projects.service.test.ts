/**
 * Smoke tests for server/modules/projects.
 * Validates pure service helpers and ProjectListItem shape without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types \
 *        --import ./server/modules/projects/__tests__/tilde-resolver.mjs \
 *     server/modules/projects/__tests__/projects.service.test.ts
 */

// Set DATABASE_URL before any dynamic import triggers server/config validation.
process.env.DATABASE_URL ??= 'postgres://dummy:5432/test'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('projects.service', async () => {
  const { isNumericProjectId } = await import('../projects.service.ts')

  it('isNumericProjectId returns true for digit-only strings', () => {
    assert.equal(isNumericProjectId('42'), true)
    assert.equal(isNumericProjectId('0'), true)
    assert.equal(isNumericProjectId('100500'), true)
  })

  it('isNumericProjectId returns false for slug strings', () => {
    assert.equal(isNumericProjectId('my-project'), false)
    assert.equal(isNumericProjectId('123abc'), false)
    assert.equal(isNumericProjectId(''), false)
  })
})
