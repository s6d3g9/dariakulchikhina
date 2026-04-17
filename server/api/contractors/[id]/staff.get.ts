import { listContractorStaff } from '~/server/modules/contractors/contractors.service'

/**
 * GET /api/contractors/[id]/staff — list staff rows belonging to the
 * contractor company (rows where parent_id equals this contractor id).
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  requireAdminOrContractor(event, id)
  return await listContractorStaff(id)
})
