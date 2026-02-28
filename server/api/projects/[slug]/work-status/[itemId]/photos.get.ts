import { useDb } from '~/server/db/index'
import { workStatusItemPhotos, workStatusItems, projects } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const itemId = Number(getRouterParam(event, 'itemId'))
  const db = useDb()

  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404 })

  const [item] = await db.select({ id: workStatusItems.id })
    .from(workStatusItems)
    .where(and(eq(workStatusItems.id, itemId), eq(workStatusItems.projectId, project.id)))
    .limit(1)
  if (!item) throw createError({ statusCode: 404 })

  return db.select().from(workStatusItemPhotos)
    .where(eq(workStatusItemPhotos.itemId, itemId))
    .orderBy(workStatusItemPhotos.createdAt)
})
