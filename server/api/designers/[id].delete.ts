import { useDb } from '~/server/db/index'
import { designers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = requireIntParam(event, 'id')

  const db = useDb()
  await db.delete(designers).where(eq(designers.id, id))
  return { ok: true }
})
