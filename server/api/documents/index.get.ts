import { listDocuments } from '~/server/modules/documents/documents.service'

/**
 * GET /api/documents?category=<cat>&projectSlug=<slug>
 * Admin list of documents. Optional filters: category and projectSlug.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const query = safeGetQuery(event)
  return await listDocuments({
    category: (query.category as string) || undefined,
    projectSlug: (query.projectSlug as string) || undefined,
  })
})
