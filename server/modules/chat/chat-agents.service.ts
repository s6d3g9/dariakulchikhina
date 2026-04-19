import { listAgents, getAgent } from '~/server/modules/agent-registry/agent-registry.service'
import type { AgentRow } from '~/server/modules/agent-registry/agent-registry.service'
import type {
  HybridControlCoordinationAgentState,
  HybridControlManagerAgentRole,
  HybridControlCommunicationChannel,
  HybridControlStakeholderRole,
} from '~/shared/types/project'

export interface ChatAgentSnapshot {
  id: string
  name: string
  description: string | null
  model: string | null
  config: Record<string, unknown>
}

function agentRowToSnapshot(agent: AgentRow): ChatAgentSnapshot {
  return {
    id: agent.id,
    name: agent.name,
    description: agent.description ?? null,
    model: agent.model ?? null,
    config: (agent.config as Record<string, unknown>) ?? {},
  }
}

function agentRowToCoordinationState(agent: AgentRow): HybridControlCoordinationAgentState {
  const cfg = (agent.config ?? {}) as Record<string, unknown>
  return {
    id: agent.id,
    title: agent.name,
    role: (cfg.role as HybridControlManagerAgentRole) ?? 'orchestrator',
    roleLabel: (cfg.roleLabel as string) ?? 'Агент',
    enabled: typeof cfg.enabled === 'boolean' ? cfg.enabled : true,
    mission: (cfg.mission as string) ?? agent.description ?? '',
    cadenceDays: typeof cfg.cadenceDays === 'number' ? cfg.cadenceDays : 0,
    linkedChannel: (cfg.linkedChannel as HybridControlCommunicationChannel) ?? 'project-room',
    linkedChannelLabel: (cfg.linkedChannelLabel as string) ?? '',
    targetRoles: Array.isArray(cfg.targetRoles) ? (cfg.targetRoles as HybridControlStakeholderRole[]) : [],
    targetRoleLabels: Array.isArray(cfg.targetRoleLabels) ? (cfg.targetRoleLabels as string[]) : [],
    recommendedActionCount: 0,
    notes: (cfg.notes as string) ?? '',
  }
}

/** Lists active agents as lightweight snapshots — ingestToken never exposed. */
export async function listChatAgents(): Promise<ChatAgentSnapshot[]> {
  const agents = await listAgents()
  return agents.map(agentRowToSnapshot)
}

/**
 * Lists agents mapped to the coordination state shape expected by the
 * bootstrap response (coordination.agents array).  Config fields written
 * by the agent-registry CRUD endpoints drive role, channel, and cadence.
 */
export async function listChatAgentCoordinationStates(): Promise<HybridControlCoordinationAgentState[]> {
  const agents = await listAgents()
  return agents.map(agentRowToCoordinationState)
}

/**
 * Fetches a single agent snapshot by id.  Returns null if deleted or
 * not found — callers should treat null as 404.
 */
export async function getChatAgentSnapshot(id: string): Promise<ChatAgentSnapshot | null> {
  const agent = await getAgent(id).catch(() => null)
  if (!agent) return null
  return agentRowToSnapshot(agent)
}
