import { createApiV1Envelope } from '~/server/utils/api-v1'
import { requireAdmin } from '~/server/utils/auth'
import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { buildProjectCommunicationActionCatalog } from '~/server/utils/project-communications-action-catalog'

export default defineEventHandler(async (event) => {
  applyMessengerCors(event)
  requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const data = await buildProjectCommunicationActionCatalog(slug)

  return createApiV1Envelope(event, data, {
    revision: `messenger-action-catalog:${slug}:${data.project.revision || 'current'}`,
  })
})
