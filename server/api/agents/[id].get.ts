import { requireAdmin } from '~/server/utils/auth'
import { getAgent } from '~/server/modules/agent-registry/agent-registry.service'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const agent = await getAgent(id)
  return { agent }
})
