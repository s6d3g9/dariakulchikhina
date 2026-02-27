import { db } from '~/server/db'
import { galleryItems } from '~/server/db/schema'
import { eq, asc } from 'drizzle-orm'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const category = getQuery(event).category as string | undefined

  if (category) {
    return db.select().from(galleryItems)
      .where(eq(galleryItems.category, category))
      .orderBy(asc(galleryItems.sortOrder), asc(galleryItems.createdAt))
  }

  return db.select().from(galleryItems)
    .orderBy(asc(galleryItems.category), asc(galleryItems.sortOrder))
})
