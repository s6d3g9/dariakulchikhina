import { listProjectDesigners } from '~/server/modules/projects/project-partners.service'

/**
 * GET /api/projects/[slug]/designers — designers linked to the project.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  requireAdminOrClient(event, slug)
  return await listProjectDesigners(slug)
})
