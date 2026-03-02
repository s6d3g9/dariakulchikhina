import { useDb } from '~/server/db/index'
import { designers } from '~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const rows = await db.select().from(designers).orderBy(asc(designers.createdAt))
  return rows
})
