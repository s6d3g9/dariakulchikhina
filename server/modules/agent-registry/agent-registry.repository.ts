import { and, eq, isNull } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { messengerAgents } from '~/server/db/schema'

export type AgentRow = typeof messengerAgents.$inferSelect
export type AgentInsert = typeof messengerAgents.$inferInsert

export async function findAllAgents(): Promise<AgentRow[]> {
  const db = useDb()
  return db.select().from(messengerAgents).where(isNull(messengerAgents.deletedAt))
}

export async function findAgentById(id: string): Promise<AgentRow | null> {
  const db = useDb()
  const [row] = await db
    .select()
    .from(messengerAgents)
    .where(and(eq(messengerAgents.id, id), isNull(messengerAgents.deletedAt)))
    .limit(1)
  return row ?? null
}

export async function insertAgent(values: Omit<AgentInsert, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'deletedAt'>): Promise<AgentRow> {
  const db = useDb()
  const [row] = await db
    .insert(messengerAgents)
    .values(values)
    .returning()
  return row
}

export async function updateAgent(
  id: string,
  version: number,
  patch: Partial<Pick<AgentRow, 'name' | 'description' | 'model' | 'config'>>,
): Promise<AgentRow | null> {
  const db = useDb()
  const [row] = await db
    .update(messengerAgents)
    .set({ ...patch, version: version + 1, updatedAt: new Date() })
    .where(and(eq(messengerAgents.id, id), eq(messengerAgents.version, version), isNull(messengerAgents.deletedAt)))
    .returning()
  return row ?? null
}

export async function softDeleteAgent(id: string, version: number): Promise<AgentRow | null> {
  const db = useDb()
  const [row] = await db
    .update(messengerAgents)
    .set({ deletedAt: new Date(), version: version + 1, updatedAt: new Date() })
    .where(and(eq(messengerAgents.id, id), eq(messengerAgents.version, version), isNull(messengerAgents.deletedAt)))
    .returning()
  return row ?? null
}
