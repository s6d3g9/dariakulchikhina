import { useDb } from '~/server/db/index'
import { designerProjects } from '~/server/db/schema'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const designerId = requireDesigner(event)
  const dpId = Number(getRouterParam(event, 'id'))
  if (!dpId) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb()

  const [deleted] = await db
    .delete(designerProjects)
    .where(and(eq(designerProjects.id, dpId), eq(designerProjects.designerId, designerId)))
    .returning()

  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  return { ok: true }
})
