import { deleteContractorDocument } from '~/server/modules/contractors/contractor-documents.service'

/**
 * DELETE /api/contractors/[id]/documents/[docId] — remove a document
 * belonging to the contractor and unlink the file.
 */
export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  const docId = Number(getRouterParam(event, 'docId'))
  requireAdminOrContractor(event, contractorId)

  const deleted = await deleteContractorDocument(contractorId, docId)
  if (!deleted) throw createError({ statusCode: 404 })
  return { ok: true }
})
