import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { getSeller } from '~/server/modules/sellers/sellers.service'
import { UnauthorizedError, NotFoundError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  async handler({ session, params }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    const seller = await getSeller(Number(params.id))
    if (!seller) throw new NotFoundError('Seller', params.id)
    return seller
  },
})
