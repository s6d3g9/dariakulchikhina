import { db } from '~/server/db'
import { galleryItems } from '~/server/db/schema'
import { requireAdmin } from '~/server/utils/auth'
import { readBody } from 'h3'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody(event)
  const { title, category, image, tags, description, sortOrder } = body

  if (!title || !category) throw createError({ statusCode: 400, message: 'title and category required' })

  const [row] = await db.insert(galleryItems).values({
    title,
    category,
    image: image || null,
    tags: Array.isArray(tags) ? tags : [],
    description: description || null,
    sortOrder: sortOrder ?? 0,
  }).returning()

  return row
})
