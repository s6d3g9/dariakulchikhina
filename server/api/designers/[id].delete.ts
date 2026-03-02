import { useDb } from '~/server/db/index'
import { designers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })

  const db = useDb()
  await db.delete(designers).where(eq(designers.id, id))
  return { ok: true }
})
