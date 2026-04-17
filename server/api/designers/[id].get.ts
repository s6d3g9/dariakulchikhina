import { getDesignerWithProjects } from '~/server/modules/designers/designers.service'

/**
 * GET /api/designers/[id] — designer row with embedded designerProjects,
 * linked clients and contractors per project, and normalized catalogs.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })
  }

  const designer = await getDesignerWithProjects(id)
  if (!designer) {
    throw createError({ statusCode: 404, statusMessage: 'Designer not found' })
  }
  return designer
})
