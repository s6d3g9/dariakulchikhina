import { z } from 'zod'
import { requireAdmin } from '~/server/utils/auth'
import { createAgent } from '~/server/modules/agent-registry/agent-registry.service'

const CreateAgentSchema = z.object({
  ownerUserId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  model: z.string().optional(),
  config: z.record(z.unknown()).optional(),
})

export default defineEventHandler(async (event) => {
  const session = requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateAgentSchema.parse)
  const agent = await createAgent(body, session.userId)
  return { agent }
})
