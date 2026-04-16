import { getProjectWorkStatusBySlug } from '~/server/modules/projects/projects.service'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  // Auth: admin or client for this project
  requireAdminOrClient(event, slug)
  const items = await getProjectWorkStatusBySlug(slug)
  if (!items) throw createError({ statusCode: 404 })
  return items
})
