import {
  reorderGalleryItems,
  ReorderGallerySchema,
} from '~/server/modules/gallery/gallery.service'

/**
 * PATCH /api/gallery/reorder — apply a batch of sortOrder updates
 * atomically. Used by the admin drag-and-drop UI.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, ReorderGallerySchema)
  return await reorderGalleryItems(body)
})
