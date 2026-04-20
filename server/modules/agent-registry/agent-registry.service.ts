import { randomUUID } from 'node:crypto'
import { NotFoundError, ConflictError } from '~/server/utils/errors'
import {
  findAllAgents,
  findAgentById,
  insertAgent,
  updateAgent,
  softDeleteAgent,
  type AgentRow,
} from './agent-registry.repository'
import { auditAgentMutation } from './agent-registry-audit.service'
import type { CreateAgentInput, UpdateAgentInput } from './agent-registry.types'

export type { AgentRow }
export * from './agent-registry.types'

export async function listAgents(): Promise<AgentRow[]> {
  return findAllAgents()
}

export async function getAgent(id: string): Promise<AgentRow> {
  const agent = await findAgentById(id)
  if (!agent) throw new NotFoundError('Agent', id)
  return agent
}

export async function createAgent(input: CreateAgentInput, actorUserId?: number): Promise<AgentRow> {
  const agent = await insertAgent({
    ownerUserId: input.ownerUserId,
    name: input.name,
    description: input.description ?? null,
    model: input.model ?? null,
    ingestToken: randomUUID(),
    config: input.config ?? {},
  })
  auditAgentMutation({ action: 'create', agentId: agent.id, actorUserId })
  return agent
}

export async function updateAgentById(
  id: string,
  input: UpdateAgentInput,
  actorUserId?: number,
): Promise<AgentRow> {
  const patch: Partial<Pick<AgentRow, 'name' | 'description' | 'model' | 'config'>> = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.description !== undefined) patch.description = input.description
  if (input.model !== undefined) patch.model = input.model
  if (input.config !== undefined) patch.config = input.config

  const agent = await updateAgent(id, input.version, patch)
  if (!agent) {
    const exists = await findAgentById(id)
    if (!exists) throw new NotFoundError('Agent', id)
    throw new ConflictError('Agent', id)
  }
  auditAgentMutation({ action: 'update', agentId: agent.id, actorUserId, patch })
  return agent
}

export async function deleteAgent(id: string, version: number, actorUserId?: number): Promise<void> {
  const agent = await softDeleteAgent(id, version)
  if (!agent) {
    const exists = await findAgentById(id)
    if (!exists) throw new NotFoundError('Agent', id)
    throw new ConflictError('Agent', id)
  }
  auditAgentMutation({ action: 'delete', agentId: agent.id, actorUserId })
}
