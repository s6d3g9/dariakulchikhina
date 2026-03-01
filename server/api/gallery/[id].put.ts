import { useDb } from '~/server/db'
import { galleryItems } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '~/server/utils/auth'
import { z } from 'zod'

const UpdateGallerySchema = z.object({
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

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedNodeBody(event, UpdateGallerySchema)

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

  const [row] = await db.update(galleryItems)
    .set(setData)
    .where(eq(galleryItems.id, id))
    .returning()

  if (!row) throw createError({ statusCode: 404, message: 'not found' })
  return row
})
