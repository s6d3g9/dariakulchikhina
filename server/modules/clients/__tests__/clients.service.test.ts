/**
 * Smoke tests for server/modules/clients.
 * Validates Zod schemas without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types \
 *        --import ./server/modules/clients/__tests__/tilde-resolver.mjs \
 *     server/modules/clients/__tests__/clients.service.test.ts
 */

// Set DATABASE_URL before any dynamic import triggers server/config validation.
process.env.DATABASE_URL ??= 'postgres://dummy:5432/test'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('clients.service', async () => {
  const { CreateClientSchema, UpdateClientSchema, LinkProjectSchema } = await import('../clients.service.ts')

  it('CreateClientSchema parses a minimal valid client', () => {
    const result = CreateClientSchema.parse({ name: '  Иван Иванов  ' })
    assert.equal(result.name, 'Иван Иванов', 'name is trimmed')
    assert.equal(result.phone, null, 'omitted nullable fields transform to null')
    assert.equal(result.email, null)
  })

  it('UpdateClientSchema accepts additional brief field', () => {
    const result = UpdateClientSchema.parse({ name: 'Клиент', brief: { style: 'modern' } })
    assert.equal(result.name, 'Клиент')
    assert.deepEqual(result.brief, { style: 'modern' })
  })

  it('LinkProjectSchema requires non-empty projectSlug', () => {
    assert.throws(() => LinkProjectSchema.parse({ projectSlug: '' }))
    const ok = LinkProjectSchema.parse({ projectSlug: 'my-project' })
    assert.equal(ok.projectSlug, 'my-project')
  })
})
