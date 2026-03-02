import { useDb } from '~/server/db/index'
import { documents } from '~/server/db/schema'
import { like, and, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const designerId = Number(getRouterParam(event, 'id'))
  if (!designerId || !Number.isFinite(designerId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })
  }

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
