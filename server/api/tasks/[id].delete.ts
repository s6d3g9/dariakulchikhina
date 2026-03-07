import { useDb } from '~/server/db/index'
import { tasks } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))

  const [row] = await db.delete(tasks).where(eq(tasks.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Task not found' })
  return { ok: true }
})
