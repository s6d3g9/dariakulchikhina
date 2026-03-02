import { useDb } from '~/server/db/index'
import { pageContent, projects } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  // Auth: admin or client for this project
  requireAdminOrClient(event, slug)
  const q = getQuery(event)
  const page = (q.page as string) || undefined

  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404 })

  if (page) {
    const [content] = await db.select().from(pageContent)
      .where(and(eq(pageContent.projectId, project.id), eq(pageContent.pageSlug, page))).limit(1)
    return content || { projectId: project.id, pageSlug: page, content: {} }
  }

  return db.select().from(pageContent).where(eq(pageContent.projectId, project.id))
})
