import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const rawUrl = event.node.req.url || ''
  const queryString = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : ''
  const params = new URLSearchParams(queryString)
  const requestedSlug = params.get('projectSlug') || undefined
  const autoMode = params.get('auto') === '1'

  const db = useDb()
  let targetSlug = requestedSlug

  if (!targetSlug) {
    const currentSessionSlug = getClientSession(event)
    if (currentSessionSlug) {
      const [sessionProject] = await db
        .select({ slug: projects.slug })
        .from(projects)
        .where(eq(projects.slug, currentSessionSlug))
        .limit(1)
      if (sessionProject?.slug) targetSlug = sessionProject.slug
    }
  }

  if (!targetSlug) {
    const [firstProject] = await db
      .select({ slug: projects.slug })
      .from(projects)
      .orderBy(asc(projects.createdAt))
      .limit(1)
    if (firstProject?.slug) targetSlug = firstProject.slug
  }

  if (!targetSlug) {
    event.node.res.statusCode = 302
    event.node.res.setHeader('Location', autoMode ? '/client/login?failed=1' : '/client/login')
    event.node.res.end('')
    return
  }

  const [project] = await db.select({ slug: projects.slug }).from(projects).where(eq(projects.slug, targetSlug)).limit(1)

  if (!project) {
    if (!requestedSlug) {
      const [firstProject] = await db
        .select({ slug: projects.slug })
        .from(projects)
        .orderBy(asc(projects.createdAt))
        .limit(1)
      if (firstProject?.slug) {
        setClientSession(event, firstProject.slug)
        event.node.res.statusCode = 302
        event.node.res.setHeader('Location', `/client/${firstProject.slug}`)
        event.node.res.end('')
        return
      }
    }

    event.node.res.statusCode = 302
    event.node.res.setHeader('Location', autoMode ? '/client/login?failed=1' : '/client/login')
    event.node.res.end('')
    return
  }

  setClientSession(event, project.slug)
  event.node.res.statusCode = 302
  event.node.res.setHeader('Location', `/client/${project.slug}`)
  event.node.res.end('')
  return
})
