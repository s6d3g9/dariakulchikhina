import { listContractorWorkItems } from '~/server/modules/contractors/contractor-work-items.service'

/**
 * GET /api/contractors/[id]/work-items — all items owned by the
 * contractor and its staff, annotated with photo/comment counts and
 * the staff member's name when the item is delegated.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  requireAdminOrContractor(event, id)
  return await listContractorWorkItems(id)
})
