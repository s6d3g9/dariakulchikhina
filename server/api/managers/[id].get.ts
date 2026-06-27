import { useDb } from '~/server/db/index'
import { managers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = requireIntParam(event, 'id')
  const db = useDb()
  const [manager] = await db.select().from(managers).where(eq(managers.id, id)).limit(1)
  if (!manager) throw createError({ statusCode: 404, statusMessage: 'Manager not found' })
  return manager
})
