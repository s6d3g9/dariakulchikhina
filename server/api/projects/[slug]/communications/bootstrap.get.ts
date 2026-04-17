import { buildProjectCommunicationBootstrap } from '~/server/modules/communications/communications-bootstrap.service'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  return await buildProjectCommunicationBootstrap(event, slug)
})