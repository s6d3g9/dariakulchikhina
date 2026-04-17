import { listContractors } from '~/server/modules/contractors/contractors.service'

/**
 * GET /api/contractors — admin list. Adds `linkedProject*` arrays
 * derived from `project_contractors`. Strips the auth-sensitive slug.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return await listContractors()
})
