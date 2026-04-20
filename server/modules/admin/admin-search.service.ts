import * as repo from './admin-search.repository'
import type { SearchProject, SearchClient, SearchContractor, SearchResults } from './admin.types'

export type { SearchProject, SearchClient, SearchContractor, SearchResults }

const MIN_QUERY_LENGTH = 2

/**
 * Global admin-side search across projects, clients, contractors. Returns
 * at most 6 rows per bucket. Queries shorter than 2 chars return an empty
 * result rather than flooding the DB with `%`-only matches.
 */
export async function searchAdminEntities(
  query: string | undefined,
): Promise<SearchResults> {
  const trimmed = query?.trim() ?? ''
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return { projects: [], clients: [], contractors: [], total: 0 }
  }

  const pattern = `%${trimmed}%`
  const { projectRows, clientRows, contractorRows } =
    await repo.searchAdminEntities(pattern)

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
