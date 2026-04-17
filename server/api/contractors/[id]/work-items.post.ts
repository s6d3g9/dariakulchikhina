import {
  createWorkItem,
  CreateWorkItemSchema,
} from '~/server/modules/contractors/contractor-work-items.service'

/**
 * POST /api/contractors/[id]/work-items — create an item assigned to
 * this contractor or one of its staff. Body includes `projectSlug` and
 * the target `contractorId`.
 */
export default defineEventHandler(async (event) => {
  const companyId = Number(getRouterParam(event, 'id'))
  requireAdminOrContractor(event, companyId)
  const body = await readValidatedNodeBody(event, CreateWorkItemSchema)
  return await createWorkItem(companyId, body)
})
