import { getProjectDetailBySlug } from '~/server/modules/projects/projects.service'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  // Auth: admin or client for this project
  requireAdminOrClient(event, slug)
  const project = await getProjectDetailBySlug(slug)
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  return project
})
