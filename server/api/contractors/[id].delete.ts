import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id')!)
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid contractor id' })
  }
  const db = useDb()

  // Delete child contractors (masters) first — parentId has no FK cascade
  await db.delete(contractors).where(eq(contractors.parentId, id))

  await db.delete(contractors).where(eq(contractors.id, id))
  return { ok: true }
})
