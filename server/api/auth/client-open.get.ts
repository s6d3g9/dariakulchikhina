import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const rawUrl = event.node.req.url || ''
  const queryString = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : ''
  const projectSlug = new URLSearchParams(queryString).get('projectSlug') || ''

  if (!projectSlug) {
    event.node.res.statusCode = 302
    event.node.res.setHeader('Location', '/client/login')
    event.node.res.end('')
    return
  }

  const db = useDb()
  const [project] = await db.select({ slug: projects.slug }).from(projects).where(eq(projects.slug, projectSlug)).limit(1)

  if (!project) {
    event.node.res.statusCode = 302
    event.node.res.setHeader('Location', '/client/login')
    event.node.res.end('')
    return
  }

  setClientSession(event, project.slug)
  event.node.res.statusCode = 302
  event.node.res.setHeader('Location', `/client/${project.slug}`)
  event.node.res.end('')
  return
})
