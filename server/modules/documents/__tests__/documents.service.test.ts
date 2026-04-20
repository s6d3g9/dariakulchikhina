/**
 * Smoke tests for server/modules/documents.
 * Validates Zod schemas without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types \
 *        --import ./server/modules/documents/__tests__/tilde-resolver.mjs \
 *     server/modules/documents/__tests__/documents.service.test.ts
 */

// Set DATABASE_URL before any dynamic import triggers server/config validation.
process.env.DATABASE_URL ??= 'postgres://dummy:5432/test'

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('documents.service', async () => {
  const { CreateDocumentSchema, UpdateDocumentSchema } = await import('../documents.service.ts')

  it('CreateDocumentSchema parses a minimal document with trimmed title', () => {
    const result = CreateDocumentSchema.parse({ title: '  Contract A  ' })
    assert.equal(result.title, 'Contract A')
    assert.equal(result.category, 'other')
    assert.equal(result.filename, undefined)
  })

  it('CreateDocumentSchema accepts a known category', () => {
    const result = CreateDocumentSchema.parse({ title: 'Invoice', category: 'invoice' })
    assert.equal(result.category, 'invoice')
  })

  it('UpdateDocumentSchema accepts partial updates', () => {
    const result = UpdateDocumentSchema.parse({ category: 'contract', notes: 'signed' })
    assert.equal(result.category, 'contract')
    assert.equal(result.notes, 'signed')
    assert.equal(result.title, undefined)
  })
})
