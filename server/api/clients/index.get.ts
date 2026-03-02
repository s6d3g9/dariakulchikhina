import { useDb } from '~/server/db/index'
import { clients, projects } from '~/server/db/schema'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const query = getQuery(event)
  const projectSlugFilter = (query.projectSlug as string) || ''

  const allClientsRaw = await db
    .select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      email: clients.email,
      messenger: clients.messenger,
      messengerNick: clients.messengerNick,
      address: clients.address,
      notes: clients.notes,
      brief: clients.brief,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .orderBy(asc(clients.createdAt))

  const allProjectsRaw = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      profile: projects.profile,
    })
    .from(projects)

  const allClients = Array.isArray(allClientsRaw)
    ? allClientsRaw
    : (allClientsRaw ? Array.from(allClientsRaw as any) : [])

  const allProjects = Array.isArray(allProjectsRaw)
    ? allProjectsRaw
    : (allProjectsRaw ? Array.from(allProjectsRaw as any) : [])

  const projectsForLinking = projectSlugFilter
    ? allProjects.filter(p => p.slug === projectSlugFilter)
    : allProjects

  const getLinkedClientIds = (profile: any): string[] => {
    const fromArray = Array.isArray(profile?.client_ids)
      ? profile.client_ids.map((id: unknown) => String(id)).filter(Boolean)
      : []
    const fromSingle = profile?.client_id ? [String(profile.client_id)] : []
    return Array.from(new Set([...fromArray, ...fromSingle]))
  }

  // attach linked projects to each client (via project.profile.client_id and project.profile.client_ids)
  return allClients.map(c => ({
    ...c,
    linkedProjects: projectsForLinking.filter(p => {
      const linkedClientIds = getLinkedClientIds(p.profile)
      return linkedClientIds.includes(String(c.id))
    }),
  })).filter(c => !projectSlugFilter || c.linkedProjects.length > 0)
})
