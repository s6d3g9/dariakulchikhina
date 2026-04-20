// Input types for agent-registry service operations.
// AgentRow (the DB row shape) lives in agent-registry.repository.ts because
// it is inferred directly from the Drizzle schema.

export interface CreateAgentInput {
  ownerUserId: string
  name: string
  description?: string
  model?: string
  config?: Record<string, unknown>
}

export interface UpdateAgentInput {
  version: number
  name?: string
  description?: string
  model?: string
  config?: Record<string, unknown>
}
