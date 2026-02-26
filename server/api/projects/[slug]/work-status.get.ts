import { useDb } from '~/server/db/index'
import { workStatusItems, projects, contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const adminS = getAdminSession(event)
  const clientS = getClientSession(event)
  if (!adminS && clientS !== slug)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404 })
  return db.select().from(workStatusItems).where(eq(workStatusItems.projectId, project.id)).orderBy(workStatusItems.sortOrder)
})
