/**
 * Smoke tests for server/modules/sellers.
 * Validates schemas and module exports without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types --test \
 *     server/modules/sellers/__tests__/sellers.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('sellers.service', async () => {
  const { CreateSellerSchema, UpdateSellerSchema } = await import('../sellers.types.ts')

  it('CreateSellerSchema parses a minimal valid seller', () => {
    const result = CreateSellerSchema.parse({ name: 'IKEA Russia' })
    assert.equal(result.name, 'IKEA Russia')
    assert.deepEqual(result.categories, [])
    assert.equal(result.phone, '')
  })

  it('UpdateSellerSchema accepts partial fields', () => {
    const result = UpdateSellerSchema.parse({ rating: 5, city: 'Moscow' })
    assert.equal(result.rating, 5)
    assert.equal(result.city, 'Moscow')
    assert.equal(result.name, undefined)
  })
})
