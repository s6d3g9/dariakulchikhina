import { defineEndpoint } from '~/server/utils/define-endpoint'
import { createGalleryItem, CreateGallerySchema, type CreateGalleryInput } from '~/server/modules/gallery/gallery.service'
import { UnauthorizedError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  input: CreateGallerySchema,
  async handler({ session, input }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    return createGalleryItem(input as CreateGalleryInput)
  },
})
