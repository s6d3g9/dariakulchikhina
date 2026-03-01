import { useDb } from '~/server/db'
import { galleryItems } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))
  const body = await readNodeBody(event) as Record<string, unknown>
  const { title, image, images, tags, description, sortOrder, category, featured, width, height, properties } = body

  const setData: Record<string, unknown> = {
    title,
    image: image || null,
    tags: Array.isArray(tags) ? tags : [],
    description: description || null,
    sortOrder: sortOrder ?? 0,
    category: (category as string) || undefined,
  }

  // Новые поля — обновляем только если переданы
  if (Array.isArray(images)) setData.images = images
  if (typeof featured === 'boolean') setData.featured = featured
  if (typeof width === 'number') setData.width = width
  if (typeof height === 'number') setData.height = height
  if (properties && typeof properties === 'object') setData.properties = properties

  const [row] = await db.update(galleryItems)
    .set(setData)
    .where(eq(galleryItems.id, id))
    .returning()

  if (!row) throw createError({ statusCode: 404, message: 'not found' })
  return row
})
