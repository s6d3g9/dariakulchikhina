/**
 * Smoke tests for server/modules/designers.
 * Validates Zod schemas without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types \
 *        --import ./server/modules/designers/__tests__/tilde-resolver.mjs \
 *     server/modules/designers/__tests__/designers.service.test.ts
 */

// Set DATABASE_URL before any dynamic import triggers server/config validation.
process.env.DATABASE_URL ??= 'postgres://dummy:5432/test'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('designers.service', async () => {
  const { CreateDesignerSchema, UpdateDesignerSchema } = await import('../designers.service.ts')

  it('CreateDesignerSchema parses a minimal valid designer', () => {
    const result = CreateDesignerSchema.parse({ name: 'Анна Дизайнер' })
    assert.equal(result.name, 'Анна Дизайнер')
    assert.equal(result.companyName, '')
    assert.deepEqual(result.specializations, [])
  })

  it('UpdateDesignerSchema accepts partial fields', () => {
    const result = UpdateDesignerSchema.parse({ city: 'Москва', email: 'anna@studio.ru' })
    assert.equal(result.city, 'Москва')
    assert.equal(result.email, 'anna@studio.ru')
    assert.equal(result.name, undefined)
  })

  it('CreateDesignerSchema rejects missing required name', () => {
    assert.throws(() => CreateDesignerSchema.parse({}), /name/)
  })
})
