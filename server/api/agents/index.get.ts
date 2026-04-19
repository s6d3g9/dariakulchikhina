import { requireAdmin } from '~/server/modules/auth/session.service'
import { listAgents } from '~/server/modules/agent-registry/agent-registry.service'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const agents = await listAgents()
  return { agents }
})
