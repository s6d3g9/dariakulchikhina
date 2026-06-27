import { useDb } from '~/server/db/index'
import { documents } from '~/server/db/schema'
import { like, and, isNull } from 'drizzle-orm'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const clientId = requireIntParam(event, 'id')
  if (!clientId || !Number.isFinite(clientId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid client id' })
  }

  const db = useDb()
  const prefix = `client:${clientId}:`
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
