import { listProjectContractors } from '~/server/modules/projects/project-partners.service'

/**
 * GET /api/projects/[slug]/contractors — contractors linked to the
 * project. Strips auth slug and financial/passport PII.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  requireAdminOrClient(event, slug)
  return await listProjectContractors(slug)
})
