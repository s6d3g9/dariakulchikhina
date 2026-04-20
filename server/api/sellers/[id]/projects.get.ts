import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { listSellerProjects } from '~/server/modules/sellers/sellers.service'
import { UnauthorizedError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  async handler({ session, params }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    return listSellerProjects(Number(params.id))
  },
})
