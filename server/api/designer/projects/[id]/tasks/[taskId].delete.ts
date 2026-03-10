import { useDb } from '~/server/db/index'
import { tasks, designerProjects } from '~/server/db/schema'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const designerId = requireDesigner(event)
  const dpId = Number(getRouterParam(event, 'id'))
  const taskId = Number(getRouterParam(event, 'taskId'))
  if (!dpId || !taskId) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb()

  const [dp] = await db
    .select({ projectId: designerProjects.projectId })
    .from(designerProjects)
    .where(and(eq(designerProjects.id, dpId), eq(designerProjects.designerId, designerId)))
    .limit(1)
  if (!dp) throw createError({ statusCode: 404 })

  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.projectId, dp.projectId!)))
  return { ok: true }
})
