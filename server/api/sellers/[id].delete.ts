import { useDb } from '~/server/db/index'
import { sellers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = parseInt(event.context.params?.id ?? '')
  if (!id) throw createError({ statusCode: 400, message: 'id required' })
  const db = useDb()
  await db.delete(sellers).where(eq(sellers.id, id))
  return { ok: true }
})
