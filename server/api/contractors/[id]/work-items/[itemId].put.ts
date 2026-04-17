import {
  updateWorkItem,
  UpdateWorkItemSchema,
} from '~/server/modules/contractors/contractor-work-items.service'

/**
 * PUT /api/contractors/[id]/work-items/[itemId] — partial update of an
 * item belonging to the contractor or its staff.
 */
export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))
  requireAdminOrContractor(event, contractorId)

  const body = await readValidatedNodeBody(event, UpdateWorkItemSchema)
  const updated = await updateWorkItem(contractorId, itemId, body)
  if (!updated) throw createError({ statusCode: 404 })
  return updated
})
