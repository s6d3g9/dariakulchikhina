import { z } from 'zod'
import { requireAdmin } from '~/server/utils/auth'
import { deleteAgent } from '~/server/modules/agent-registry/agent-registry.service'

const DeleteAgentSchema = z.object({
  version: z.number().int().min(1),
})

export default defineEventHandler(async (event) => {
  const session = requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedNodeBody(event, DeleteAgentSchema.parse)
  await deleteAgent(id, body.version, session.userId)
  return { ok: true }
})
