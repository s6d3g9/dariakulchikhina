import {
  updateContractorSelf,
  ContractorSelfUpdateSchema,
} from '~/server/modules/contractors/contractors.service'

/**
 * PUT /api/contractors/[id]/self — contractor self-update. Accepts a
 * narrower field set than the admin update.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  requireAdminOrContractor(event, id)
  const body = await readValidatedNodeBody(event, ContractorSelfUpdateSchema)
  const updated = await updateContractorSelf(id, body)
  if (!updated) throw createError({ statusCode: 404 })
  return updated
})
