import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  return db.select().from(projects).orderBy(projects.createdAt)
})
