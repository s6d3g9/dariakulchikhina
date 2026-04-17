import { deleteGalleryItem } from '~/server/modules/gallery/gallery.service'

/**
 * DELETE /api/gallery/[id] — remove the row and clean up referenced
 * files from the upload directory.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) throw createError({ statusCode: 400 })

  const deleted = await deleteGalleryItem(id)
  if (!deleted) throw createError({ statusCode: 404 })
  return { ok: true }
})
