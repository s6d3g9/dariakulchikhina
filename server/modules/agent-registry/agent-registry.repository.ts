import { eq, isNull } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { messengerAgents } from '~/server/db/schema'

export interface AgentSnapshot {
  id: string
  name: string
  description: string | null
  model: string | null
  createdAt: Date
  updatedAt: Date
}

const AGENT_COLUMNS = {
  id: messengerAgents.id,
  name: messengerAgents.name,
  description: messengerAgents.description,
  model: messengerAgents.model,
  createdAt: messengerAgents.createdAt,
  updatedAt: messengerAgents.updatedAt,
}

export async function listAgentSnapshots(): Promise<AgentSnapshot[]> {
  const db = useDb()
  return db
    .select(AGENT_COLUMNS)
    .from(messengerAgents)
    .where(isNull(messengerAgents.deletedAt))
}

export async function findAgentSnapshotById(agentId: string): Promise<AgentSnapshot | null> {
  const db = useDb()
  const rows = await db
    .select(AGENT_COLUMNS)
    .from(messengerAgents)
    .where(eq(messengerAgents.id, agentId))
    .limit(1)

  return rows[0] ?? null
}
