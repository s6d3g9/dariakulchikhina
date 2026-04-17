import {
  updateSeller,
  UpdateSellerSchema,
} from '~/server/modules/sellers/sellers.service'

/**
 * PUT /api/sellers/[id] — partial update.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid seller id' })
  }
  const body = await readValidatedNodeBody(event, UpdateSellerSchema)
  const updated = await updateSeller(id, body)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Seller not found' })
  return updated
})
