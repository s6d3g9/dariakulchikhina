import { useDb } from '~/server/db/index'
import { projects, clients, contractors } from '~/server/db/schema'
import { ilike, or } from 'drizzle-orm'

interface SearchProject {
  id: number
  slug: string
  title: string
  status: string
  type: 'project'
  href: string
}
interface SearchClient {
  id: number
  name: string
  phone: string | null
  email: string | null
  type: 'client'
  href: string
}
interface SearchContractor {
  id: number
  slug: string
  name: string
  companyName: string | null
  phone: string | null
  type: 'contractor'
  href: string
}

export interface SearchResults {
  projects: SearchProject[]
  clients: SearchClient[]
  contractors: SearchContractor[]
  total: number
}

export default defineEventHandler(async (event): Promise<SearchResults> => {
  requireAdmin(event)
  const q = (safeGetQuery(event).q as string | undefined)?.trim()

  if (!q || q.length < 2) {
    return { projects: [], clients: [], contractors: [], total: 0 }
  }

  const pattern = `%${q}%`
  const db = useDb()

  const [projectRows, clientRows, contractorRows] = await Promise.all([
    db.select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
    })
      .from(projects)
      .where(or(
        ilike(projects.title, pattern),
        ilike(projects.slug, pattern),
      ))
      .limit(6),

    db.select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      email: clients.email,
    })
      .from(clients)
      .where(or(
        ilike(clients.name, pattern),
        ilike(clients.phone, pattern),
        ilike(clients.email, pattern),
      ))
      .limit(6),

    db.select({
      id: contractors.id,
      slug: contractors.slug,
      name: contractors.name,
      companyName: contractors.companyName,
      phone: contractors.phone,
    })
      .from(contractors)
      .where(or(
        ilike(contractors.name, pattern),
        ilike(contractors.companyName, pattern),
        ilike(contractors.contactPerson, pattern),
        ilike(contractors.phone, pattern),
      ))
      .limit(6),
  ])

  const mappedProjects: SearchProject[] = projectRows.map((r: typeof projectRows[number]) => ({
    ...r,
    type: 'project' as const,
    href: `/admin/projects/${r.slug}`,
  }))
  const mappedClients: SearchClient[] = clientRows.map((r: typeof clientRows[number]) => ({
    ...r,
    type: 'client' as const,
    href: `/admin/clients`,
  }))
  const mappedContractors: SearchContractor[] = contractorRows.map((r: typeof contractorRows[number]) => ({
    ...r,
    type: 'contractor' as const,
    href: `/admin/contractors/${r.id}`,
  }))

  return {
    projects: mappedProjects,
    clients: mappedClients,
    contractors: mappedContractors,
    total: mappedProjects.length + mappedClients.length + mappedContractors.length,
  }
})
