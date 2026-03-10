import { useDb } from '~/server/db/index'
import { managers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid manager id' })
  const db = useDb()
  const [manager] = await db.select().from(managers).where(eq(managers.id, id)).limit(1)
  if (!manager) throw createError({ statusCode: 404, statusMessage: 'Manager not found' })
  return manager
})
