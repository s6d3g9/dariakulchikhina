import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { updateManager, UpdateManagerSchema } from '~/server/modules/managers/managers.service'
import { UnauthorizedError, NotFoundError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  input: UpdateManagerSchema,
  async handler({ session, params, input }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    const updated = await updateManager(Number(params.id), input)
    if (!updated) throw new NotFoundError('Manager', params.id)
    return updated
  },
})
