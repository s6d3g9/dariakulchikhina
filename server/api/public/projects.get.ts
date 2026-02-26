import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'

export default defineEventHandler(async () => {
  const db = useDb()
  const rows = await db.select({ slug: projects.slug, title: projects.title }).from(projects).orderBy(projects.createdAt)
  return rows
})
