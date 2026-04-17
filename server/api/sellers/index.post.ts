import {
  createSeller,
  CreateSellerSchema,
} from '~/server/modules/sellers/sellers.service'

/**
 * POST /api/sellers — create a new seller row.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateSellerSchema)
  return await createSeller(body)
})
