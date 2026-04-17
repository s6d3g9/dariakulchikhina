import { getManager } from '~/server/modules/managers/managers.service'

/**
 * GET /api/managers/[id]
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid manager id' })
  }
  const manager = await getManager(id)
  if (!manager) throw createError({ statusCode: 404, statusMessage: 'Manager not found' })
  return manager
})
