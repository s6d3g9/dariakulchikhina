import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { listManagers } from '~/server/modules/managers/managers.service'
import { UnauthorizedError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  query: z.object({ projectSlug: z.string().optional() }),
  async handler({ session, query }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    return listManagers({ projectSlug: (query.projectSlug as string) || undefined })
  },
})
