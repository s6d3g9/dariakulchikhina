import { useDb } from '~/server/db/index'
import { documents } from '~/server/db/schema'
import { like, and, isNull } from 'drizzle-orm'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const designerId = requireIntParam(event, 'id')

  const db = useDb()
  const prefix = `designer:${designerId}:`
  const rows = await db
    .select()
    .from(documents)
    .where(and(
      like(documents.category, `${prefix}%`),
      isNull(documents.projectId),
    ))
    .orderBy(documents.createdAt)

  return rows.map((row) => ({
    ...row,
    category: row.category.replace(prefix, ''),
  }))
})
