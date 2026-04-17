import { deleteWorkItemPhoto } from '~/server/modules/contractors/contractor-work-items.service'

/**
 * DELETE /api/contractors/[id]/work-items/[itemId]/photos/[photoId] —
 * remove a photo (scoped to this contractor's items) and unlink the
 * file with path-traversal protection.
 */
export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))
  const photoId = Number(getRouterParam(event, 'photoId'))
  requireAdminOrContractor(event, contractorId)

  const deleted = await deleteWorkItemPhoto(contractorId, itemId, photoId)
  if (!deleted) throw createError({ statusCode: 404 })
  return { ok: true }
})
