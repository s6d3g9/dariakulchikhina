import { defineEndpoint } from '~/server/utils/define-endpoint'
import { createAgent, CreateAgentSchema } from '~/server/modules/agent-registry/agent-registry.service'
import { UnauthorizedError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  input: CreateAgentSchema,
  async handler({ session, input }) {
    if (!session || session.role !== 'admin') throw new UnauthorizedError()
    return { agent: await createAgent(input, session.id) }
  },
})
