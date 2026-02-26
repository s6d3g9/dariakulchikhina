import { useDb } from '~/server/db/index'
import { pageContent, projects } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const rawUrl = event.node.req.url || ''
  const queryString = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : ''
  const page = new URLSearchParams(queryString).get('page') || undefined

  const adminS = getAdminSession(event)
  const clientS = getClientSession(event)
  if (!adminS && clientS !== slug)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

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
