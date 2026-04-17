import { listGalleryItems } from '~/server/modules/gallery/gallery.service'

/**
 * GET /api/gallery — admin list with optional filters:
 * `category`, `tag`, `featured=true`, `search`.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const query = safeGetQuery(event)
  return await listGalleryItems({
    category: (query.category as string) || undefined,
    tag: (query.tag as string) || undefined,
    featured: (query.featured as string) || undefined,
    search: (query.search as string) || undefined,
  })
})
