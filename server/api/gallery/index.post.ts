import { useDb } from '~/server/db'
import { galleryItems } from '~/server/db/schema'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const body = await readNodeBody(event) as Record<string, unknown>
  const { title, category, image, images, tags, description, sortOrder, featured, width, height, properties } = body

  if (!title || !category) throw createError({ statusCode: 400, message: 'title and category required' })

  const [row] = await db.insert(galleryItems).values({
    title: title as string,
    category: category as string,
    image: (image as string) || null,
    images: Array.isArray(images) ? images as string[] : [],
    tags: Array.isArray(tags) ? tags as string[] : [],
    description: (description as string) || null,
    featured: featured === true,
    width: typeof width === 'number' ? width : null,
    height: typeof height === 'number' ? height : null,
    sortOrder: (sortOrder as number) ?? 0,
    properties: (properties && typeof properties === 'object') ? properties as Record<string, unknown> : {},
  }).returning()

  return row
})
