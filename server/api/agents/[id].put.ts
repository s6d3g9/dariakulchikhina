import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { updateAgentById, UpdateAgentSchema } from '~/server/modules/agent-registry/agent-registry.service'
import { UnauthorizedError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  params: z.object({ id: z.string() }),
  input: UpdateAgentSchema,
  async handler({ session, params, input }) {
    if (!session || session.role !== 'admin') throw new UnauthorizedError()
    return { agent: await updateAgentById(params.id, input, session.id) }
  },
})
