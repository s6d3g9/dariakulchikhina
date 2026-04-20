import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { updateGalleryItem, UpdateGallerySchema } from '~/server/modules/gallery/gallery.service'
import { UnauthorizedError, NotFoundError } from '~/server/utils/errors'

/**
 * PUT /api/gallery/[id] — partial update of a gallery item.
 *
 * Migrated to defineEndpoint (wave28-8). Behaviour identical to original.
 */
export default defineEndpoint({
  auth: 'required',
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  input: UpdateGallerySchema,
  async handler({ session, params, input }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    const row = await updateGalleryItem(Number(params.id), input)
    if (!row) throw new NotFoundError('GalleryItem', params.id)
    return row
  },
})
