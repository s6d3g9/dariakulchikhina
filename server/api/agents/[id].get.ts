import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { getAgent } from '~/server/modules/agent-registry/agent-registry.service'
import { UnauthorizedError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  params: z.object({ id: z.string() }),
  async handler({ session, params }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    return { agent: await getAgent(params.id) }
  },
})
