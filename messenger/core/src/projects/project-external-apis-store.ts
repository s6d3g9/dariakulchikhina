import { eq, isNull, and } from 'drizzle-orm'
import { useMessengerDb } from '../db/client.ts'
import { messengerProjectExternalApis } from '../db/schema.ts'

export type MessengerProjectExternalApi = typeof messengerProjectExternalApis.$inferSelect

export async function listProjectExternalApis(projectId: string): Promise<MessengerProjectExternalApi[]> {
  const db = useMessengerDb()
  return db
    .select()
    .from(messengerProjectExternalApis)
    .where(and(eq(messengerProjectExternalApis.projectId, projectId), isNull(messengerProjectExternalApis.deletedAt)))
    .orderBy(messengerProjectExternalApis.createdAt)
}

export async function createProjectExternalApi(
  projectId: string,
  input: { name: string; baseUrl: string; openapiRef?: string; authType?: string; config?: Record<string, unknown>; enabled?: boolean },
): Promise<MessengerProjectExternalApi> {
  const db = useMessengerDb()
  const [row] = await db
    .insert(messengerProjectExternalApis)
    .values({
      projectId,
      name: input.name,
      baseUrl: input.baseUrl,
      openapiRef: input.openapiRef ?? null,
      authType: input.authType ?? 'none',
      config: input.config ?? {},
      enabled: input.enabled ?? true,
    })
    .returning()
  return row!
}

export async function updateProjectExternalApi(
  id: string,
  projectId: string,
  input: Partial<{ name: string; baseUrl: string; openapiRef: string; authType: string; config: Record<string, unknown>; enabled: boolean }>,
): Promise<MessengerProjectExternalApi | null> {
  const db = useMessengerDb()
  const updates: Partial<typeof messengerProjectExternalApis.$inferInsert> = {
    updatedAt: new Date(),
    ...input,
  }
  const [row] = await db
    .update(messengerProjectExternalApis)
    .set(updates)
    .where(and(eq(messengerProjectExternalApis.id, id), eq(messengerProjectExternalApis.projectId, projectId), isNull(messengerProjectExternalApis.deletedAt)))
    .returning()
  return row ?? null
}

export async function deleteProjectExternalApi(id: string, projectId: string): Promise<void> {
  const db = useMessengerDb()
  await db
    .update(messengerProjectExternalApis)
    .set({ deletedAt: new Date() })
    .where(and(eq(messengerProjectExternalApis.id, id), eq(messengerProjectExternalApis.projectId, projectId)))
}
