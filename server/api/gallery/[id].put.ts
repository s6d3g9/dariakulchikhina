import { db } from '~/server/db'
import { galleryItems } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)
  const { title, image, tags, description, sortOrder } = body

  const [row] = await db.update(galleryItems)
    .set({
      title,
      image: image || null,
      tags: Array.isArray(tags) ? tags : [],
      description: description || null,
      sortOrder: sortOrder ?? 0,
    })
    .where(eq(galleryItems.id, id))
    .returning()

  if (!row) throw createError({ statusCode: 404, message: 'not found' })
  return row
})
