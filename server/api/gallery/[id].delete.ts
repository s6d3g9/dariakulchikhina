import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { deleteGalleryItem } from '~/server/modules/gallery/gallery.service'
import { UnauthorizedError, NotFoundError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  async handler({ session, params }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    const deleted = await deleteGalleryItem(Number(params.id))
    if (!deleted) throw new NotFoundError('GalleryItem', params.id)
    return { ok: true }
  },
})
