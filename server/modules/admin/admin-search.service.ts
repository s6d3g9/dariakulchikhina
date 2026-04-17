import { ilike, or } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { projects, clients, contractors } from '~/server/db/schema'

export interface SearchProject {
  id: number
  slug: string
  title: string
  status: string
  type: 'project'
  href: string
}
export interface SearchClient {
  id: number
  name: string
  phone: string | null
  email: string | null
  type: 'client'
  href: string
}
export interface SearchContractor {
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

const MIN_QUERY_LENGTH = 2
const LIMIT_PER_ENTITY = 6

/**
 * Global admin-side search across projects, clients, contractors. Returns
 * at most 6 rows per bucket. Queries shorter than 2 chars return an empty
 * result rather than flooding the DB with `%`-only matches.
 */
export async function searchAdminEntities(query: string | undefined): Promise<SearchResults> {
  const trimmed = query?.trim() ?? ''
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return { projects: [], clients: [], contractors: [], total: 0 }
  }

  const pattern = `%${trimmed}%`
  const db = useDb()

  const [projectRows, clientRows, contractorRows] = await Promise.all([
    db
      .select({
        id: projects.id,
        slug: projects.slug,
        title: projects.title,
        status: projects.status,
      })
      .from(projects)
      .where(or(ilike(projects.title, pattern), ilike(projects.slug, pattern)))
      .limit(LIMIT_PER_ENTITY),

    db
      .select({
        id: clients.id,
        name: clients.name,
        phone: clients.phone,
        email: clients.email,
      })
      .from(clients)
      .where(
        or(
          ilike(clients.name, pattern),
          ilike(clients.phone, pattern),
          ilike(clients.email, pattern),
        ),
      )
      .limit(LIMIT_PER_ENTITY),

    db
      .select({
        id: contractors.id,
        slug: contractors.slug,
        name: contractors.name,
        companyName: contractors.companyName,
        phone: contractors.phone,
      })
      .from(contractors)
      .where(
        or(
          ilike(contractors.name, pattern),
          ilike(contractors.companyName, pattern),
          ilike(contractors.contactPerson, pattern),
          ilike(contractors.phone, pattern),
        ),
      )
      .limit(LIMIT_PER_ENTITY),
  ])

  const mappedProjects: SearchProject[] = projectRows.map((r) => ({
    ...r,
    type: 'project' as const,
    href: `/admin/projects/${r.slug}`,
  }))
  const mappedClients: SearchClient[] = clientRows.map((r) => ({
    ...r,
    type: 'client' as const,
    href: `/admin/clients`,
  }))
  const mappedContractors: SearchContractor[] = contractorRows.map((r) => ({
    ...r,
    type: 'contractor' as const,
    href: `/admin/contractors/${r.id}`,
  }))

  return {
    projects: mappedProjects,
    clients: mappedClients,
    contractors: mappedContractors,
    total:
      mappedProjects.length + mappedClients.length + mappedContractors.length,
  }
}
