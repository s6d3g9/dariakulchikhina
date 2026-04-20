import { defineEndpoint } from '~/server/utils/define-endpoint'
import { listAgents } from '~/server/modules/agent-registry/agent-registry.service'
import { UnauthorizedError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  async handler({ session }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    return { agents: await listAgents() }
  },
})
