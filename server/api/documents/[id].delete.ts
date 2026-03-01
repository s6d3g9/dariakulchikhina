import { useDb } from '~/server/db/index'
import { documents } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400 })

  const db = useDb()
  const [deleted] = await db.delete(documents).where(eq(documents.id, id)).returning()
  if (!deleted) throw createError({ statusCode: 404 })
  return { ok: true }
})
