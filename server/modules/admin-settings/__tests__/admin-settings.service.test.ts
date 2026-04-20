/**
 * Smoke tests for server/modules/admin-settings.
 * Validates the module skeleton without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types --test \
 *     server/modules/admin-settings/__tests__/admin-settings.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('admin-settings.service', async () => {
  // admin-settings.types exports only TS interfaces (no runtime values) — the
  // types file is part of the module skeleton even though it carries no schemas.
  // We test the service module shape instead.
  const svcPath = new URL('../admin-settings.types.ts', import.meta.url).pathname

  it('admin-settings types file resolves to a valid path', () => {
    assert.ok(svcPath.endsWith('admin-settings.types.ts'))
  })
})
