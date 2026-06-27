import { buildProjectCommunicationActionCatalog } from '~/server/utils/project-communications-action-catalog'
import { requireAdmin } from '~/server/utils/auth'
import { applyMessengerCors } from '~/server/utils/messenger-cors'

export default defineEventHandler(async (event) => {
  applyMessengerCors(event)
  requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  return buildProjectCommunicationActionCatalog(slug)
})
