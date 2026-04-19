import { eq, isNull, and } from 'drizzle-orm'
import { useMessengerDb } from '../db/client.ts'
import { messengerProjects } from '../db/schema.ts'

export type MessengerProject = typeof messengerProjects.$inferSelect

export async function listMessengerAgentProjects(ownerUserId: string): Promise<MessengerProject[]> {
  const db = useMessengerDb()
  return db
    .select()
    .from(messengerProjects)
    .where(and(eq(messengerProjects.ownerUserId, ownerUserId), isNull(messengerProjects.deletedAt)))
    .orderBy(messengerProjects.createdAt)
}

export async function getMessengerAgentProject(id: string): Promise<MessengerProject | null> {
  const db = useMessengerDb()
  const [row] = await db
    .select()
    .from(messengerProjects)
    .where(and(eq(messengerProjects.id, id), isNull(messengerProjects.deletedAt)))
  return row ?? null
}

export async function createMessengerAgentProject(
  ownerUserId: string,
  input: { name: string; description?: string; icon?: string; color?: string },
): Promise<MessengerProject> {
  const db = useMessengerDb()
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60) + '-' + Date.now().toString(36)
  const [row] = await db
    .insert(messengerProjects)
    .values({
      ownerUserId,
      name: input.name,
      slug,
      description: input.description ?? null,
      icon: input.icon ?? null,
      color: input.color ?? null,
    })
    .returning()
  return row!
}

export async function deleteMessengerAgentProject(id: string): Promise<void> {
  const db = useMessengerDb()
  await db
    .update(messengerProjects)
    .set({ deletedAt: new Date() })
    .where(eq(messengerProjects.id, id))
}
