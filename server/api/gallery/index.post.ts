import {
  createGalleryItem,
  CreateGallerySchema,
} from '~/server/modules/gallery/gallery.service'

/**
 * POST /api/gallery — create a new gallery item.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateGallerySchema)
  return await createGalleryItem(body)
})
