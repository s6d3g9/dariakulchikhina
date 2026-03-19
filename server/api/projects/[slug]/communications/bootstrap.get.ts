import { buildProjectCommunicationBootstrap } from '~/server/utils/communications'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  return await buildProjectCommunicationBootstrap(event, slug)
})