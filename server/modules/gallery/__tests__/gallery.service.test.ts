/**
 * Smoke tests for server/modules/gallery.
 * Validates schemas and module exports without a live DB.
 *
 * Usage:
 *   node --experimental-strip-types --test \
 *     server/modules/gallery/__tests__/gallery.service.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('gallery.service', async () => {
  const { CreateGallerySchema, ReorderGallerySchema } = await import('../gallery.types.ts')

  it('CreateGallerySchema parses a minimal valid gallery item', () => {
    const result = CreateGallerySchema.parse({ title: 'Living Room', category: 'interior' })
    assert.equal(result.title, 'Living Room')
    assert.equal(result.category, 'interior')
    assert.deepEqual(result.images, [])
    assert.equal(result.featured, false)
    assert.equal(result.sortOrder, 0)
  })

  it('ReorderGallerySchema parses a valid reorder batch', () => {
    const result = ReorderGallerySchema.parse({ items: [{ id: 1, sortOrder: 0 }, { id: 2, sortOrder: 1 }] })
    assert.equal(result.items.length, 2)
    assert.equal(result.items[0]!.id, 1)
  })
})
