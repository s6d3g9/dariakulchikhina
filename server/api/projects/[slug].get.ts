import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  // Auth: admin or client for this project
  requireAdminOrClient(event, slug)
  const db = useDb()
  const [project] = await db.select().from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  return project
})
