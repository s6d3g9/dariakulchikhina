import { searchAdminEntities, type SearchResults } from '~/server/modules/admin/admin-search.service'

export type { SearchResults } from '~/server/modules/admin/admin-search.service'

/**
 * GET /api/admin/search?q=<term> — global admin search over projects,
 * clients, and contractors. Returns empty buckets for queries shorter
 * than 2 chars.
 */
export default defineEventHandler(async (event): Promise<SearchResults> => {
  requireAdmin(event)
  const q = safeGetQuery(event).q as string | undefined
  return await searchAdminEntities(q)
})
