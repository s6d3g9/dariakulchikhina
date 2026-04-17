import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { eq, asc, and, ilike, arrayContains } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { galleryItems } from '~/server/db/schema'
import { getUploadDir } from '~/server/utils/storage'

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
  const db = useDb()

  const conditions = []
  if (opts.category) conditions.push(eq(galleryItems.category, opts.category))
  if (opts.tag) conditions.push(arrayContains(galleryItems.tags, [opts.tag]))
  if (opts.featured === 'true') conditions.push(eq(galleryItems.featured, true))
  if (opts.search) {
    const escaped = opts.search.replace(/[%_\\]/g, (ch) => `\\${ch}`)
    conditions.push(ilike(galleryItems.title, `%${escaped}%`))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  return db
    .select()
    .from(galleryItems)
    .where(where)
    .orderBy(asc(galleryItems.sortOrder), asc(galleryItems.createdAt))
}

/**
 * Insert a new gallery item. All defaultable fields are filled by the
 * Zod schema so the DB defaults are never relied on for drift safety.
 */
export async function createGalleryItem(body: CreateGalleryInput) {
  const db = useDb()
  const [row] = await db
    .insert(galleryItems)
    .values({
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
    .returning()
  return row
}

/**
 * Partial-update a gallery item. Only fields present in `body` are
 * written. Returns null when the id does not exist so the handler can
 * map to 404 explicitly.
 */
export async function updateGalleryItem(id: number, body: UpdateGalleryInput) {
  const db = useDb()

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

  const [row] = await db
    .update(galleryItems)
    .set(setData)
    .where(eq(galleryItems.id, id))
    .returning()
  return row ?? null
}

/**
 * Delete a gallery item and unlink any referenced image files from the
 * upload directory. Returns null when the id does not exist.
 */
export async function deleteGalleryItem(id: number) {
  const db = useDb()
  const [item] = await db
    .select()
    .from(galleryItems)
    .where(eq(galleryItems.id, id))
    .limit(1)
  if (!item) return null

  await db.delete(galleryItems).where(eq(galleryItems.id, id))

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
  const db = useDb()
  await db.transaction(async (tx) => {
    for (const item of body.items) {
      await tx
        .update(galleryItems)
        .set({ sortOrder: item.sortOrder })
        .where(eq(galleryItems.id, item.id))
    }
  })
  return { ok: true as const, updated: body.items.length }
}
