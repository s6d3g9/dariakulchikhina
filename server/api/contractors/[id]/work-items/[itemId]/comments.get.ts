import { listWorkItemComments } from '~/server/modules/contractors/contractor-work-items.service'

/**
 * GET /api/contractors/[id]/work-items/[itemId]/comments — ordered
 * by createdAt asc.
 */
export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))
  requireAdminOrContractor(event, contractorId)
  return await listWorkItemComments(contractorId, itemId)
})
