import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const rawUrl = event.node.req.url || ''
  const queryString = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : ''
  const projectSlug = new URLSearchParams(queryString).get('projectSlug') || ''

  if (!projectSlug) {
    return sendRedirect(event, '/client/login', 302)
  }

  const db = useDb()
  const [project] = await db.select({ slug: projects.slug }).from(projects).where(eq(projects.slug, projectSlug)).limit(1)

  if (!project) {
    return sendRedirect(event, '/client/login', 302)
  }

  setClientSession(event, project.slug)
  return sendRedirect(event, `/client/${project.slug}`, 302)
})
