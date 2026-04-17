import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { buildProjectActionCatalog } from '~/server/modules/projects/project-communications-api.service'

/**
 * GET /api/projects/[slug]/communications/action-catalog
 * Full action-catalog payload for the communications panel (phases,
 * sprints, tasks, subjects, objects, docs, services).
 */
export default defineEventHandler(async (event) => {
  applyMessengerCors(event)
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }
  return await buildProjectActionCatalog(slug)
})
