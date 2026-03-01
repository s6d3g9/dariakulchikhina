import { useDb } from '~/server/db'
import { galleryItems } from '~/server/db/schema'
import { requireAdmin } from '~/server/utils/auth'
import { z } from 'zod'

const CreateGallerySchema = z.object({
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

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateGallerySchema)
  const db = useDb()

  const [row] = await db.insert(galleryItems).values({
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
  }).returning()

  return row
})
