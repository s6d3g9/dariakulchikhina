/**
 * Smoke tests for server/modules/managers.
 * Validates schemas and module exports without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types --test \
 *     server/modules/managers/__tests__/managers.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('managers.service', async () => {
  const { CreateManagerSchema, UpdateManagerSchema } = await import('../managers.types.ts')

  it('CreateManagerSchema parses a minimal valid manager', () => {
    const result = CreateManagerSchema.parse({ name: 'Алексей Иванов' })
    assert.equal(result.name, 'Алексей Иванов')
    assert.equal(result.role, '')
    assert.equal(result.slug, undefined)
  })

  it('UpdateManagerSchema accepts partial fields', () => {
    const result = UpdateManagerSchema.parse({ city: 'Москва', email: 'a@b.ru' })
    assert.equal(result.city, 'Москва')
    assert.equal(result.email, 'a@b.ru')
    assert.equal(result.name, undefined)
  })
})
