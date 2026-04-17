import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { getUploadDir } from '~/server/modules/uploads/upload-storage.service'
import * as repo from './gallery.repository'

export const CreateGallerySchema = z.object({
  title: z.string().min(1).max(500),
  category: z.string().min(1).max(200),
  image: z.string().max(500).nullable().optional(),
  images: z.array(z.string().max(500)).max(100).default([]),
  tags: z.array(z.string().max(100)).max(50).default([]),
  description: z.string().max(5000).nullable().optional(),
  featured: z.boolean().default(false),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().default(0),
  properties: z.record(z.unknown()).default({}),
})
export type CreateGalleryInput = z.infer<typeof CreateGallerySchema>

export const UpdateGallerySchema = z.object({
  title: z.string().min(1).max(500).optional(),
  category: z.string().min(1).max(200).optional(),
  image: z.string().max(500).nullable().optional(),
  images: z.array(z.string().max(500)).max(100).optional(),
  tags: z.array(z.string().max(100)).max(50).optional(),
  description: z.string().max(5000).nullable().optional(),
  featured: z.boolean().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  sortOrder: z.number().int().optional(),
  properties: z.record(z.unknown()).optional(),
})
export type UpdateGalleryInput = z.infer<typeof UpdateGallerySchema>

export const ReorderGallerySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number(),
        sortOrder: z.number(),
      }),
    )
    .max(1000),
})
export type ReorderGalleryInput = z.infer<typeof ReorderGallerySchema>

export interface ListGalleryOptions {
  category?: string
  tag?: string
  featured?: string
  search?: string
}

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
