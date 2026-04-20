import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { listGalleryItems } from '~/server/modules/gallery/gallery.service'
import { UnauthorizedError } from '~/server/utils/errors'

/**
 * GET /api/gallery — admin list with optional filters:
 * `category`, `tag`, `featured=true`, `search`.
 *
 * Migrated to defineEndpoint (wave28-8). Behaviour identical to original.
 */
export default defineEndpoint({
  auth: 'required',
  query: z.object({
    category: z.string().optional(),
    tag: z.string().optional(),
    featured: z.string().optional(),
    search: z.string().optional(),
  }),
  async handler({ session, query }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    return listGalleryItems({
      category: (query.category as string) || undefined,
      tag: (query.tag as string) || undefined,
      featured: (query.featured as string) || undefined,
      search: (query.search as string) || undefined,
    })
  },
})
