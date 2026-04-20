// Input types for agent-registry service operations.
// AgentRow (the DB row shape) lives in agent-registry.repository.ts because
// it is inferred directly from the Drizzle schema.

import { z } from 'zod'

export const CreateAgentSchema = z.object({
  ownerUserId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  model: z.string().optional(),
  config: z.record(z.unknown()).optional(),
})
export type CreateAgentInput = z.infer<typeof CreateAgentSchema>

export const UpdateAgentSchema = z.object({
  version: z.number().int().min(1),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  model: z.string().optional(),
  config: z.record(z.unknown()).optional(),
})
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>

export const DeleteAgentSchema = z.object({
  version: z.number().int().min(1),
})
export type DeleteAgentInput = z.infer<typeof DeleteAgentSchema>
