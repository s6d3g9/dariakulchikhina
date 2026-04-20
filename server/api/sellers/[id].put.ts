import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { updateSeller, UpdateSellerSchema } from '~/server/modules/sellers/sellers.service'
import { UnauthorizedError, NotFoundError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  input: UpdateSellerSchema,
  async handler({ session, params, input }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    const updated = await updateSeller(Number(params.id), input)
    if (!updated) throw new NotFoundError('Seller', params.id)
    return updated
  },
})
