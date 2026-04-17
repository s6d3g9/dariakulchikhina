import { deleteDocument } from '~/server/modules/documents/documents.service'

/**
 * DELETE /api/documents/[id] — remove the row and clean up the attached
 * file from the upload directory.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400 })

  const deleted = await deleteDocument(id)
  if (!deleted) throw createError({ statusCode: 404 })
  return { ok: true }
})
