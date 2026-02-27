import { useDb } from '~/server/db/index'
import { clients } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const db = useDb()
  await db.delete(clients).where(eq(clients.id, id))
  return { ok: true }
})
