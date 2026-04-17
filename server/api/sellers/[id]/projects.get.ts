import { listSellerProjects } from '~/server/modules/sellers/sellers.service'

/**
 * GET /api/sellers/[id]/projects — projects linked via seller_projects.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid seller id' })
  }
  return await listSellerProjects(id)
})
