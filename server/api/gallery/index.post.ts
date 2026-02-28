import { useDb } from '~/server/db'
import { galleryItems } from '~/server/db/schema'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const body = await readNodeBody(event) as Record<string, unknown>
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
