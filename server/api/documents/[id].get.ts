import { useDb } from '~/server/db/index'
import { documents } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

/**
 * GET /api/documents/[id]
 * Возвращает документ по id.
 * Доступен для admin и для аутентифицированного клиента
 * (клиент получит документ только если у него активная сессия).
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, message: 'Invalid id' })

  // Нужна хотя бы одна активная сессия (admin или client)
  const admin  = getAdminSession(event)
  const client = getClientSession(event)
  if (!admin && !client) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const db = useDb()
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1)

  if (!doc) throw createError({ statusCode: 404, message: 'Document not found' })

  return doc
})
