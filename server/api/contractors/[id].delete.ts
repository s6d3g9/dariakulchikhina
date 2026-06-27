import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = requireIntParam(event, 'id')
  const db = useDb()

  // Delete child contractors (masters) first — parentId has no FK cascade
  await db.delete(contractors).where(eq(contractors.parentId, id))

  await db.delete(contractors).where(eq(contractors.id, id))
  return { ok: true }
})
