import { getSeller } from '~/server/modules/sellers/sellers.service'

/**
 * GET /api/sellers/[id]
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid seller id' })
  }
  const seller = await getSeller(id)
  if (!seller) throw createError({ statusCode: 404, statusMessage: 'Seller not found' })
  return seller
})
