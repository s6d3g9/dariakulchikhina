import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { getManager } from '~/server/modules/managers/managers.service'
import { UnauthorizedError, NotFoundError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  async handler({ session, params }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    const manager = await getManager(Number(params.id))
    if (!manager) throw new NotFoundError('Manager', params.id)
    return manager
  },
})
