import { requireAdmin } from '~/server/utils/auth'
import { listAgents } from '~/server/modules/agent-registry/agent-registry.service'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const agents = await listAgents()
  return { agents }
})
