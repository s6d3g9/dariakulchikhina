import {
  listAgentSnapshots,
  findAgentSnapshotById,
  type AgentSnapshot,
} from '~/server/modules/agent-registry/agent-registry.repository'

export type { AgentSnapshot }

export async function listChatAgents(): Promise<AgentSnapshot[]> {
  return listAgentSnapshots()
}

export async function findChatAgentById(agentId: string): Promise<AgentSnapshot | null> {
  return findAgentSnapshotById(agentId)
}
