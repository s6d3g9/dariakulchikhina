import { listSellers } from '~/server/modules/sellers/sellers.service'

/**
 * GET /api/sellers?projectSlug=<slug> — admin list. With projectSlug
 * returns only sellers linked to that project.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const q = safeGetQuery(event)
  return await listSellers({ projectSlug: (q.projectSlug as string) || undefined })
})
