import {
  addWorkItemComment,
  CommentSchema,
} from '~/server/modules/contractors/contractor-work-items.service'

/**
 * POST /api/contractors/[id]/work-items/[itemId]/comments — add a
 * contractor-authored comment.
 */
export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))
  requireAdminOrContractor(event, contractorId)
  const { text } = await readValidatedNodeBody(event, CommentSchema)
  return await addWorkItemComment(contractorId, itemId, text)
})
