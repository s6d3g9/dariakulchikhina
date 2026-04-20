/**
 * Smoke tests for server/modules/documents.
 * Validates schemas without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types --test \
 *     server/modules/documents/__tests__/documents.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('documents.service', async () => {
  const { CreateDocumentSchema, UpdateDocumentSchema, DocumentCategory } = await import('../documents.types.ts')

  it('CreateDocumentSchema parses a minimal valid document', () => {
    const result = CreateDocumentSchema.parse({ title: 'Contract' })
    assert.equal(result.title, 'Contract')
    assert.equal(result.category, 'other')
  })

  it('CreateDocumentSchema trims title whitespace', () => {
    const result = CreateDocumentSchema.parse({ title: '  Invoice  ' })
    assert.equal(result.title, 'Invoice')
  })

  it('DocumentCategory rejects unknown values', () => {
    assert.throws(() => DocumentCategory.parse('unknown_category'))
  })

  it('UpdateDocumentSchema allows partial updates', () => {
    const result = UpdateDocumentSchema.parse({ notes: 'test note' })
    assert.equal(result.notes, 'test note')
    assert.equal(result.title, undefined)
  })
})
