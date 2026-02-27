import { useDb } from '~/server/db/index'
import { clients, projects } from '~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()

  const allClients = await db.select().from(clients).orderBy(asc(clients.createdAt))
  const allProjects = await db.select({
    id: projects.id,
    slug: projects.slug,
    title: projects.title,
    status: projects.status,
    profile: projects.profile,
  }).from(projects)

  // attach linked projects to each client (via project.profile.client_id)
  return allClients.map(c => ({
    ...c,
    linkedProjects: allProjects.filter(p =>
      String((p.profile as any)?.client_id) === String(c.id)
    ),
  }))
})
