export type AgentRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface AgentDto {
  id: string
  ownerUserId: string
  projectId: string | null
  name: string
  description: string | null
  model: string | null
  config: Record<string, unknown>
  createdAt: string
  updatedAt: string
  version: number
}

export interface AgentRunDto {
  id: string
  agentId: string
  conversationId: string
  parentRunId: string | null
  rootRunId: string | null
  spawnedByAgentId: string | null
  status: AgentRunStatus
  prompt: string | null
  result: string | null
  error: string | null
  costUsd: string
  tokenInTotal: number
  tokenOutTotal: number
  attachmentIds: string[]
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
  version: number
}

export interface AgentRunEventDto {
  id: string
  runId: string
  occurredAt: string
  substate: string | null
  tokenIn: number | null
  tokenOut: number | null
  message: string | null
  payload: unknown
}
