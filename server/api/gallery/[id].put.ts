import {
  updateGalleryItem,
  UpdateGallerySchema,
} from '~/server/modules/gallery/gallery.service'

/**
 * PUT /api/gallery/[id] — partial update of a gallery item.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) throw createError({ statusCode: 400 })

  const body = await readValidatedNodeBody(event, UpdateGallerySchema)
  const row = await updateGalleryItem(id, body)
  if (!row) throw createError({ statusCode: 404, message: 'not found' })
  return row
})
