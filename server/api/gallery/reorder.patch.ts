import { defineEndpoint } from '~/server/utils/define-endpoint'
import { reorderGalleryItems, ReorderGallerySchema } from '~/server/modules/gallery/gallery.service'
import { UnauthorizedError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  input: ReorderGallerySchema,
  async handler({ session, input }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    return reorderGalleryItems(input)
  },
})
