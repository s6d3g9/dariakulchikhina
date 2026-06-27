import { useDb } from '~/server/db/index'
import { documents, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireIntParam } from '~/server/utils/query'

/**
 * GET /api/documents/[id]
 * Возвращает документ по id.
 * Доступен для admin и для аутентифицированного клиента
 * (клиент получит документ только если он принадлежит его проекту).
 */
export default defineEventHandler(async (event) => {
  const id = requireIntParam(event, 'id')

  // Нужна хотя бы одна активная сессия (admin или client)
  const admin  = getAdminSession(event)
  const clientSlug = getClientSession(event)
  if (!admin && !clientSlug) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const db = useDb()
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, id))
    .limit(1)

  if (!doc) throw createError({ statusCode: 404, message: 'Document not found' })

  // Scope check: client can only access documents belonging to their project
  if (!admin && clientSlug) {
    const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, clientSlug)).limit(1)
    if (!project || doc.projectId !== project.id) {
      throw createError({ statusCode: 404, message: 'Document not found' })
    }
  }

  return doc
})
