import { z } from 'zod'
import { requireAdmin } from '~/server/modules/auth/session.service'
import { updateAgentById } from '~/server/modules/agent-registry/agent-registry.service'

const UpdateAgentSchema = z.object({
  version: z.number().int().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  model: z.string().optional(),
  config: z.record(z.unknown()).optional(),
})

export default defineEventHandler(async (event) => {
  const session = requireAdmin(event)
  const id = getRouterParam(event, 'id')!
  const body = await readValidatedNodeBody(event, UpdateAgentSchema.parse)
  const agent = await updateAgentById(id, body, session.userId)
  return { agent }
})
