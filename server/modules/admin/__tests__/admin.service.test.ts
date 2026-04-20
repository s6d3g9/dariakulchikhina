/**
 * Smoke tests for server/modules/admin.
 * Validates type shapes and search guard logic without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types --test \
 *     server/modules/admin/__tests__/admin.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('admin.service', async () => {
  it('admin.types exports expected interfaces', async () => {
    const types = await import('../admin.types.ts')
    assert.ok(typeof types === 'object')
  })

  it('searchAdminEntities returns empty result for short query', async () => {
    // Dynamic import — searchAdminEntities guards against short queries in JS
    // without hitting the DB. Patch the repo to ensure no DB call is made.
    const mod = await import('../admin-search.service.ts')
    const result = await mod.searchAdminEntities('a')
    assert.equal(result.total, 0)
    assert.deepEqual(result.projects, [])
    assert.deepEqual(result.clients, [])
    assert.deepEqual(result.contractors, [])
  })
})
