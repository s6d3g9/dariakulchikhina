import { deleteSeller } from '~/server/modules/sellers/sellers.service'

/**
 * DELETE /api/sellers/[id]
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid seller id' })
  }
  await deleteSeller(id)
  return { ok: true }
})
