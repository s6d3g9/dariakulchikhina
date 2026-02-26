import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  return db.select().from(contractors).orderBy(contractors.name)
})
