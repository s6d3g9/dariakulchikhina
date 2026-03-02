import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  // Require admin auth — don't expose project slugs publicly
  requireAdmin(event)
  const db = useDb()
  const rows = await db.select({ slug: projects.slug, title: projects.title }).from(projects).orderBy(projects.createdAt)
  return rows
})
