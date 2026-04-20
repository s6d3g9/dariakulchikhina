/**
 * Smoke tests for server/modules/contractors.
 * Validates Zod schemas without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types \
 *        --import ./server/modules/contractors/__tests__/tilde-resolver.mjs \
 *     server/modules/contractors/__tests__/contractors.service.test.ts
 */

// Set DATABASE_URL before any dynamic import triggers server/config validation.
process.env.DATABASE_URL ??= 'postgres://dummy:5432/test'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('contractors.service', async () => {
  const { ContractorSelfUpdateSchema } = await import('../contractors.service.ts')

  it('ContractorSelfUpdateSchema accepts an empty update (all fields optional)', () => {
    const result = ContractorSelfUpdateSchema.parse({})
    assert.equal(result.name, undefined)
    assert.equal(result.phone, undefined)
  })

  it('ContractorSelfUpdateSchema parses name and workTypes', () => {
    const result = ContractorSelfUpdateSchema.parse({
      name: 'ООО Строй',
      workTypes: ['electrical', 'plumbing'],
    })
    assert.equal(result.name, 'ООО Строй')
    assert.deepEqual(result.workTypes, ['electrical', 'plumbing'])
  })

  it('ContractorSelfUpdateSchema rejects name exceeding max length', () => {
    assert.throws(() =>
      ContractorSelfUpdateSchema.parse({ name: 'A'.repeat(201) }),
    )
  })
})
