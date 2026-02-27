import { useDb } from '~/server/db/index'
import { clients, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const clientIdSession = getClientIdSession(event)
  const adminSession = getAdminSession(event)
  if (!clientIdSession && !adminSession)
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const id = Number(getRouterParam(event, 'id'))
  if (clientIdSession && clientIdSession !== id)
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const db = useDb()
  const [client] = await db.select({
    id: clients.id,
    name: clients.name,
    phone: clients.phone,
    email: clients.email,
    brief: clients.brief,
  }).from(clients).where(eq(clients.id, id)).limit(1)

  if (!client) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  // Find linked project (where profile.client_id === id)
  const allProjects = await db.select({
    slug: projects.slug,
    title: projects.title,
    status: projects.status,
    profile: projects.profile,
  }).from(projects)

  const linkedProject = allProjects.find(p =>
    String((p.profile as any)?.client_id) === String(id)
  ) || null

  return { ...client, linkedProject }
})
