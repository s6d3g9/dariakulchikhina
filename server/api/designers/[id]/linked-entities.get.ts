import { getDesignerLinkedEntities } from '~/server/modules/designers/designers.service'

/**
 * GET /api/designers/[id]/linked-entities — sellers and managers
 * reachable through any of the designer's projects, plus the global
 * gallery split into regular items and moodboards.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })
  }
  return await getDesignerLinkedEntities(id)
})
