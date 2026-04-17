import { listManagers } from '~/server/modules/managers/managers.service'

/**
 * GET /api/managers?projectSlug=<slug>
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const q = safeGetQuery(event)
  return await listManagers({ projectSlug: (q.projectSlug as string) || undefined })
})
