import { listWorkStatusItemPhotos } from '~/server/modules/projects/project-work-status-items.service'

/**
 * GET /api/projects/[slug]/work-status/[itemId]/photos
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const itemId = Number(getRouterParam(event, 'itemId'))
  return await listWorkStatusItemPhotos(slug, itemId)
})
