import { eq, isNull, and } from 'drizzle-orm'
import { useMessengerDb } from '../db/client.ts'
import { messengerProjectMcp } from '../db/schema.ts'

export type MessengerProjectMcpServer = typeof messengerProjectMcp.$inferSelect

export async function listProjectMcpServers(projectId: string): Promise<MessengerProjectMcpServer[]> {
  const db = useMessengerDb()
  return db
    .select()
    .from(messengerProjectMcp)
    .where(and(eq(messengerProjectMcp.projectId, projectId), isNull(messengerProjectMcp.deletedAt)))
    .orderBy(messengerProjectMcp.createdAt)
}

export async function createProjectMcpServer(
  projectId: string,
  input: { name: string; transport: string; endpoint: string; config?: Record<string, unknown>; enabled?: boolean },
): Promise<MessengerProjectMcpServer> {
  const db = useMessengerDb()
  const [row] = await db
    .insert(messengerProjectMcp)
    .values({
      projectId,
      name: input.name,
      transport: input.transport,
      endpoint: input.endpoint,
      config: input.config ?? {},
      enabled: input.enabled ?? true,
    })
    .returning()
  return row!
}

export async function updateProjectMcpServer(
  id: string,
  projectId: string,
  input: Partial<{ name: string; transport: string; endpoint: string; config: Record<string, unknown>; enabled: boolean }>,
): Promise<MessengerProjectMcpServer | null> {
  const db = useMessengerDb()
  const updates: Partial<typeof messengerProjectMcp.$inferInsert> = {
    updatedAt: new Date(),
    ...input,
  }
  const [row] = await db
    .update(messengerProjectMcp)
    .set(updates)
    .where(and(eq(messengerProjectMcp.id, id), eq(messengerProjectMcp.projectId, projectId), isNull(messengerProjectMcp.deletedAt)))
    .returning()
  return row ?? null
}

export async function deleteProjectMcpServer(id: string, projectId: string): Promise<void> {
  const db = useMessengerDb()
  await db
    .update(messengerProjectMcp)
    .set({ deletedAt: new Date() })
    .where(and(eq(messengerProjectMcp.id, id), eq(messengerProjectMcp.projectId, projectId)))
}
