import { useDb } from '~/server/db/index'
import { tasks, designerProjects } from '~/server/db/schema'
import { and, eq } from 'drizzle-orm'
import { readNodeBody } from '~/server/utils/body'

export default defineEventHandler(async (event) => {
  const designerId = requireDesigner(event)
  const dpId = Number(getRouterParam(event, 'id'))
  const taskId = Number(getRouterParam(event, 'taskId'))
  if (!dpId || !taskId) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb()

  // Verify project belongs to this designer
  const [dp] = await db
    .select({ projectId: designerProjects.projectId })
    .from(designerProjects)
    .where(and(eq(designerProjects.id, dpId), eq(designerProjects.designerId, designerId)))
    .limit(1)
  if (!dp) throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })

  const body = await readNodeBody(event) as Record<string, unknown>

  const ALLOWED = ['title','description','workType','serviceDescription','dateStart','dateEnd','budget','assignedContractorId','notes','status']
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  for (const k of ALLOWED) if (k in body) updates[k] = body[k] ?? null

  const [updated] = await db.update(tasks).set(updates).where(and(
    eq(tasks.id, taskId),
    eq(tasks.projectId, dp.projectId!),
  )).returning()

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Задача не найдена' })
  return updated
})
