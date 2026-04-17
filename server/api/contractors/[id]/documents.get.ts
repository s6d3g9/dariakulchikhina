import { listContractorDocuments } from '~/server/modules/contractors/contractor-documents.service'

/**
 * GET /api/contractors/[id]/documents — list docs filed under the
 * contractor.
 */
export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  requireAdminOrContractor(event, contractorId)
  return await listContractorDocuments(contractorId)
})
