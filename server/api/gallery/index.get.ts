import { useDb } from '~/server/db'
import { galleryItems } from '~/server/db/schema'
import { eq, asc, and, ilike, arrayContains } from 'drizzle-orm'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const rawUrl = event.node?.req?.url || event.path || ''
  const queryString = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : ''
  const params = new URLSearchParams(queryString)

  const category = params.get('category') || undefined
  const tag = params.get('tag') || undefined
  const featured = params.get('featured') || undefined
  const search = params.get('search') || undefined

  const conditions = []
  if (category) conditions.push(eq(galleryItems.category, category))
  if (tag) conditions.push(arrayContains(galleryItems.tags, [tag]))
  if (featured === 'true') conditions.push(eq(galleryItems.featured, true))
  if (search) conditions.push(ilike(galleryItems.title, `%${search}%`))

  const where = conditions.length > 0 ? and(...conditions) : undefined

  return db.select().from(galleryItems)
    .where(where)
    .orderBy(asc(galleryItems.sortOrder), asc(galleryItems.createdAt))
})
