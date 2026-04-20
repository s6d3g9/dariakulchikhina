import { defineEndpoint } from '~/server/utils/define-endpoint'
import { createSeller, CreateSellerSchema, type CreateSellerInput } from '~/server/modules/sellers/sellers.service'
import { UnauthorizedError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  input: CreateSellerSchema,
  async handler({ session, input }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    return createSeller(input as CreateSellerInput)
  },
})
