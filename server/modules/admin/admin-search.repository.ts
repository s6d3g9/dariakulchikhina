import { ilike, or } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { projects, clients, contractors } from '~/server/db/schema'
import type { SearchProjectRow, SearchClientRow, SearchContractorRow } from './admin.types'

export type { SearchProjectRow, SearchClientRow, SearchContractorRow }

const LIMIT_PER_ENTITY = 6

/**
 * Run the three scoped LIKE queries in parallel (projects / clients /
 * contractors) and return the raw rows. Mapping to the final response
 * shape (type/href) is the service's concern.
 */
export async function searchAdminEntities(pattern: string) {
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

  return {
    projectRows: projectRows as SearchProjectRow[],
    clientRows: clientRows as SearchClientRow[],
    contractorRows: contractorRows as SearchContractorRow[],
  }
}
