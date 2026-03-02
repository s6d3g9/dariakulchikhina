import { useDb } from '~/server/db'
import { galleryItems } from '~/server/db/schema'
import { eq, asc, and, ilike, arrayContains } from 'drizzle-orm'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const query = getQuery(event)

  const category = (query.category as string) || undefined
  const tag = (query.tag as string) || undefined
  const featured = (query.featured as string) || undefined
  const search = (query.search as string) || undefined

  const conditions = []
  if (category) conditions.push(eq(galleryItems.category, category))
  if (tag) conditions.push(arrayContains(galleryItems.tags, [tag]))
  if (featured === 'true') conditions.push(eq(galleryItems.featured, true))
  if (search) {
    // Escape LIKE wildcard characters to prevent wildcard injection
    const escaped = search.replace(/[%_\\]/g, (ch) => `\\${ch}`)
    conditions.push(ilike(galleryItems.title, `%${escaped}%`))
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined

  return db.select().from(galleryItems)
    .where(where)
    .orderBy(asc(galleryItems.sortOrder), asc(galleryItems.createdAt))
})
