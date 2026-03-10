import { useDb } from '~/server/db/index'
import { documents, designerProjects } from '~/server/db/schema'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const designerId = requireDesigner(event)
  const dpId = Number(getRouterParam(event, 'id'))
  const docId = Number(getRouterParam(event, 'docId'))
  if (!dpId || !docId) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb()

  // Verify project belongs to this designer
  const [dp] = await db
    .select({ projectId: designerProjects.projectId })
    .from(designerProjects)
    .where(and(eq(designerProjects.id, dpId), eq(designerProjects.designerId, designerId)))
    .limit(1)
  if (!dp) throw createError({ statusCode: 404 })

  // Delete the document (verify it belongs to this project)
  const [deleted] = await db
    .delete(documents)
    .where(and(eq(documents.id, docId), eq(documents.projectId, dp.projectId!)))
    .returning()

  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Документ не найден' })
  return { ok: true }
})
