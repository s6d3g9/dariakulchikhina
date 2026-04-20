/**
 * Smoke tests for server/modules/clients.
 * Validates schemas without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types --test \
 *     server/modules/clients/__tests__/clients.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('clients.service', async () => {
  const { CreateClientSchema, UpdateClientSchema, LinkProjectSchema } = await import('../clients.types.ts')

  it('CreateClientSchema parses a minimal client', () => {
    const result = CreateClientSchema.parse({ name: 'Alice' })
    assert.equal(result.name, 'Alice')
    assert.equal(result.phone, null)
  })

  it('CreateClientSchema trims name whitespace', () => {
    const result = CreateClientSchema.parse({ name: '  Bob  ' })
    assert.equal(result.name, 'Bob')
  })

  it('CreateClientSchema rejects empty name', () => {
    assert.throws(() => CreateClientSchema.parse({ name: '' }))
  })

  it('UpdateClientSchema allows partial updates with brief', () => {
    const result = UpdateClientSchema.parse({ brief: { key: 'value' } })
    assert.deepEqual(result.brief, { key: 'value' })
    assert.equal(result.name, undefined)
  })

  it('LinkProjectSchema rejects empty projectSlug', () => {
    assert.throws(() => LinkProjectSchema.parse({ projectSlug: '' }))
  })

  it('LinkProjectSchema parses a valid slug', () => {
    const result = LinkProjectSchema.parse({ projectSlug: 'project-alpha' })
    assert.equal(result.projectSlug, 'project-alpha')
  })
})
