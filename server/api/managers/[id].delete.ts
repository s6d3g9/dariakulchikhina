import { useDb } from '~/server/db/index'
import { managers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid manager id' })
  const db = useDb()
  await db.delete(managers).where(eq(managers.id, id))
  return { ok: true }
})
