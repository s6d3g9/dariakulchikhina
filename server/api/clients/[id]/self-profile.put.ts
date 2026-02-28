import { useDb } from '~/server/db/index'
import { clients, projects, pageContent } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const clientIdSession = getClientIdSession(event)
  const adminSession = getAdminSession(event)
  if (!clientIdSession && !adminSession)
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const id = Number(getRouterParam(event, 'id'))
  if (clientIdSession && clientIdSession !== id)
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const body = await readNodeBody(event) as { content: Record<string, unknown> }
  if (!body?.content) throw createError({ statusCode: 400, statusMessage: 'Missing content' })

  const db = useDb()

  // Find linked project
  const allProjects = await db.select({ id: projects.id, profile: projects.profile }).from(projects)
  const linkedProject = allProjects.find(p =>
    String((p.profile as any)?.client_id) === String(id)
  )
  if (!linkedProject) throw createError({ statusCode: 404, statusMessage: 'No linked project' })

  const existing = await db.select({ id: pageContent.id }).from(pageContent)
    .where(and(eq(pageContent.projectId, linkedProject.id), eq(pageContent.pageSlug, 'self_profile')))
    .limit(1)

  if (existing.length > 0) {
    const [updated] = await db.update(pageContent)
      .set({ content: body.content, updatedAt: new Date() })
      .where(and(eq(pageContent.projectId, linkedProject.id), eq(pageContent.pageSlug, 'self_profile')))
      .returning()
    return updated
  }

  const [inserted] = await db.insert(pageContent).values({
    projectId: linkedProject.id,
    pageSlug: 'self_profile',
    content: body.content,
  }).returning()
  return inserted
})
