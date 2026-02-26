import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id')!)
  const db = useDb()
  await db.delete(contractors).where(eq(contractors.id, id))
  return { ok: true }
})
