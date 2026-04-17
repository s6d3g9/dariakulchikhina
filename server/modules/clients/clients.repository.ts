import { eq, and, asc, like, isNull, sql } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { clients, projects, documents } from '~/server/db/schema'

export async function findClientById(id: number) {
  const db = useDb()
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)
  return client ?? null
}

export async function listAllClientsPartial() {
  const db = useDb()
  return db
    .select({
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      email: clients.email,
      messenger: clients.messenger,
      messengerNick: clients.messengerNick,
      address: clients.address,
      notes: clients.notes,
      brief: clients.brief,
      createdAt: clients.createdAt,
    })
    .from(clients)
    .orderBy(asc(clients.createdAt))
}

export async function listAllProjectsForLinking() {
  const db = useDb()
  return db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      profile: projects.profile,
    })
    .from(projects)
}

export async function insertClient(values: {
  name: string
  phone?: string | null
  email?: string | null
  messenger?: string | null
  messengerNick?: string | null
  address?: string | null
  notes?: string | null
}) {
  const db = useDb()
  const [c] = await db.insert(clients).values(values).returning()
  return c
}

export async function updateClientRow(
  id: number,
  values: Record<string, unknown>,
) {
  const db = useDb()
  const [c] = await db.update(clients).set(values).where(eq(clients.id, id)).returning()
  return c ?? null
}

export async function listProjectsReferencingClientId(clientId: number) {
  const db = useDb()
  return db
    .select({ id: projects.id, profile: projects.profile })
    .from(projects)
    .where(sql`${projects.profile}->>'client_id' = ${String(clientId)}`)
}

export async function listProjectsContainingClientIdInArray(clientId: number) {
  const db = useDb()
  return db
    .select({ id: projects.id, profile: projects.profile })
    .from(projects)
    .where(
      sql`${projects.profile}->'client_ids' @> ${JSON.stringify([clientId])}::jsonb`,
    )
}

export async function updateProjectProfile(
  projectId: number,
  profile: Record<string, unknown>,
) {
  const db = useDb()
  await db
    .update(projects)
    .set({ profile: profile as unknown as Record<string, string> })
    .where(eq(projects.id, projectId))
}

export async function deleteClientRow(id: number) {
  const db = useDb()
  await db.delete(clients).where(eq(clients.id, id))
}

// ── Client-scoped documents ───────────────────────────────────────────

export async function listClientDocumentsByPrefix(prefix: string) {
  const db = useDb()
  return db
    .select()
    .from(documents)
    .where(and(like(documents.category, `${prefix}%`), isNull(documents.projectId)))
    .orderBy(documents.createdAt)
}

export async function insertClientDocument(values: {
  projectId: null
  category: string
  title: string
  filename: string
  url: string
  notes: string | null
}) {
  const db = useDb()
  const [doc] = await db.insert(documents).values(values).returning()
  return doc
}

export async function findClientDocumentByIdAndPrefix(
  docId: number,
  prefix: string,
) {
  const db = useDb()
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, docId),
        like(documents.category, `${prefix}%`),
        isNull(documents.projectId),
      ),
    )
    .limit(1)
  return doc ?? null
}

export async function deleteClientDocumentRow(docId: number) {
  const db = useDb()
  await db.delete(documents).where(eq(documents.id, docId))
}

// ── Client ↔ Project linking ──────────────────────────────────────────

export async function findProjectBySlug(slug: string) {
  const db = useDb()
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return project ?? null
}

export async function updateProjectProfileAndTimestamp(
  slug: string,
  profile: Record<string, unknown>,
) {
  const db = useDb()
  const [updated] = await db
    .update(projects)
    .set({
      profile: profile as unknown as Record<string, string>,
      updatedAt: new Date(),
    })
    .where(eq(projects.slug, slug))
    .returning()
  return updated ?? null
}
