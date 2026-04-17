import { listManagerProjects } from '~/server/modules/managers/managers.service'

/**
 * GET /api/managers/[id]/projects — projects linked via manager_projects.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid manager id' })
  }
  return await listManagerProjects(id)
})
