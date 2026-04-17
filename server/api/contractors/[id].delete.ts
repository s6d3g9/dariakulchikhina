import { deleteContractor } from '~/server/modules/contractors/contractors.service'

/**
 * DELETE /api/contractors/[id] — removes the contractor and cascades
 * to any child rows linked via `parent_id`.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id')!)
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid contractor id' })
  }
  await deleteContractor(id)
  return { ok: true }
})
