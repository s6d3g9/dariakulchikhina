import { useDb } from '~/server/db/index'
import { sellers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = requireIntParam(event, 'id')

  const db = useDb()
  const [seller] = await db.select().from(sellers).where(eq(sellers.id, id)).limit(1)
  if (!seller) throw createError({ statusCode: 404, statusMessage: 'Seller not found' })
  return seller
})
