import { getDocumentContext } from '~/server/modules/documents/documents.service'

/**
 * GET /api/documents/context?projectSlug=<slug>
 * Aggregated data from project + linked clients/contractors for
 * auto-populating document templates.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const q = safeGetQuery(event)
  const projectSlug = (q.projectSlug as string) || ''
  return await getDocumentContext(projectSlug)
})
