import { useDb } from '~/server/db/index'
import { managers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = requireIntParam(event, 'id')
  const db = useDb()
  await db.delete(managers).where(eq(managers.id, id))
  return { ok: true }
})
