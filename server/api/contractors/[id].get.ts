import { getContractor } from '~/server/modules/contractors/contractors.service'

/**
 * GET /api/contractors/[id] — fetch a contractor row (slug stripped).
 * Accessible to the admin or the contractor themselves.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id')!)
  requireAdminOrContractor(event, id)
  const contractor = await getContractor(id)
  if (!contractor) throw createError({ statusCode: 404 })
  return contractor
})
