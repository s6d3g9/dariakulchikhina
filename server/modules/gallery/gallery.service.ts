import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { getUploadDir } from '~/server/modules/uploads/upload-storage.service'
import * as repo from './gallery.repository'
import type { CreateGalleryInput, UpdateGalleryInput, ReorderGalleryInput, ListGalleryOptions } from './gallery.types'

export * from './gallery.types'

/**
 * List gallery items with optional filters. `search` ilike-matches the
 * title; wildcard chars are escaped to prevent pattern injection. Results
 * are sorted by `sortOrder` then `createdAt` to give the admin UI a
 * stable order that reacts to manual reorder operations.
 */
export async function listGalleryItems(opts: ListGalleryOptions = {}) {
  return repo.listGalleryItems(opts)
}

/**
 * Insert a new gallery item. All defaultable fields are filled by the
 * Zod schema so the DB defaults are never relied on for drift safety.
 */
export async function createGalleryItem(body: CreateGalleryInput) {
  return repo.insertGalleryItem({
    title: body.title,
    category: body.category,
    image: body.image || null,
    images: body.images,
    tags: body.tags,
    description: body.description || null,
    featured: body.featured,
    width: body.width ?? null,
    height: body.height ?? null,
    sortOrder: body.sortOrder,
    properties: body.properties,
  })
}

/**
 * Partial-update a gallery item. Only fields present in `body` are
 * written. Returns null when the id does not exist so the handler can
 * map to 404 explicitly.
 */
export async function updateGalleryItem(id: number, body: UpdateGalleryInput) {
  const setData: Record<string, unknown> = {}
  if (body.title !== undefined) setData.title = body.title
  if (body.category !== undefined) setData.category = body.category
  if (body.image !== undefined) setData.image = body.image || null
  if (body.tags !== undefined) setData.tags = body.tags
  if (body.description !== undefined) setData.description = body.description || null
  if (body.sortOrder !== undefined) setData.sortOrder = body.sortOrder
  if (body.images !== undefined) setData.images = body.images
  if (body.featured !== undefined) setData.featured = body.featured
  if (body.width !== undefined) setData.width = body.width
  if (body.height !== undefined) setData.height = body.height
  if (body.properties !== undefined) setData.properties = body.properties

  return repo.updateGalleryItemRow(id, setData)
}

/**
 * Delete a gallery item and unlink any referenced image files from the
 * upload directory. Returns null when the id does not exist.
 */
export async function deleteGalleryItem(id: number) {
  const item = await repo.deleteGalleryItemRow(id)
  if (!item) return null

  const uploadDir = getUploadDir()
  const filesToDelete: string[] = []
  if (item.image) filesToDelete.push(path.basename(item.image))
  if (Array.isArray(item.images)) {
    for (const img of item.images) {
      if (typeof img === 'string' && img) filesToDelete.push(path.basename(img))
    }
  }
  for (const fn of filesToDelete) {
    if (fn && !fn.includes('..')) {
      try {
        await unlink(path.join(uploadDir, fn))
      } catch {
        // file may already be deleted — ignore
      }
    }
  }

  return item
}

/**
 * Apply a batch of sortOrder updates atomically. Intended for the
 * drag-and-drop reorder UI, which sends up to 1000 pairs in one call.
 */
export async function reorderGalleryItems(body: ReorderGalleryInput) {
  await repo.reorderGalleryItemsRows(body.items)
  return { ok: true as const, updated: body.items.length }
}
