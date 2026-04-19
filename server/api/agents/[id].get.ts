import { requireAdmin } from '~/server/modules/auth/session.service'
import { getAgent } from '~/server/modules/agent-registry/agent-registry.service'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const agent = await getAgent(id)
  return { agent }
})
