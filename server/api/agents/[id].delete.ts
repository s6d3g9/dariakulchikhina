import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { deleteAgent, DeleteAgentSchema } from '~/server/modules/agent-registry/agent-registry.service'
import { UnauthorizedError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  params: z.object({ id: z.string() }),
  input: DeleteAgentSchema,
  async handler({ session, params, input }) {
    if (!session || session.role !== 'admin') throw new UnauthorizedError()
    await deleteAgent(params.id, input.version, session.id)
    return { ok: true }
  },
})
