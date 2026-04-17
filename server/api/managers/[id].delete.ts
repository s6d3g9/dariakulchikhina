import { deleteManager } from '~/server/modules/managers/managers.service'

/**
 * DELETE /api/managers/[id]
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid manager id' })
  }
  await deleteManager(id)
  return { ok: true }
})
