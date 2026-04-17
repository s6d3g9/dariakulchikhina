import { writeFile, mkdir, unlink } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { eq, and, sql, asc, like, isNull } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { clients, projects, documents } from '~/server/db/schema'
import { validateUploadedFile } from '~/server/utils/upload-validation'

// ── Schemas ────────────────────────────────────────────────────────────

export const CreateClientSchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()),
  phone: z.string().max(50).nullable().optional().transform((v) => v?.trim() || null),
  email: z.string().max(200).nullable().optional().transform((v) => v?.trim() || null),
  messenger: z.string().max(100).nullable().optional().transform((v) => v?.trim() || null),
  messengerNick: z.string().max(100).nullable().optional().transform((v) => v?.trim() || null),
  address: z.string().max(500).nullable().optional().transform((v) => v?.trim() || null),
  notes: z.string().max(5000).nullable().optional().transform((v) => v?.trim() || null),
})
export type CreateClientInput = z.infer<typeof CreateClientSchema>

export const UpdateClientSchema = CreateClientSchema.extend({
  brief: z.record(z.unknown()).nullable().optional(),
})
export type UpdateClientInput = z.infer<typeof UpdateClientSchema>

export const LinkProjectSchema = z.object({
  projectSlug: z.string().min(1).max(200),
})
export type LinkProjectInput = z.infer<typeof LinkProjectSchema>

// ── Listing ────────────────────────────────────────────────────────────

export interface ListClientsOptions {
  projectSlug?: string
}

function getLinkedClientIds(profile: Record<string, unknown> | null | undefined): string[] {
  if (!profile) return []
  const fromArray = Array.isArray(profile.client_ids)
    ? (profile.client_ids as unknown[]).map((id) => String(id)).filter(Boolean)
    : []
  const fromSingle = profile.client_id ? [String(profile.client_id)] : []
  return Array.from(new Set([...fromArray, ...fromSingle]))
}

/**
 * List all clients with an attached `linkedProjects` array derived from
 * each project's `profile.client_ids` / `profile.client_id`. When
 * `projectSlug` is passed, only clients linked to that project are kept.
 */
export async function listClients(opts: ListClientsOptions = {}) {
  const db = useDb()

  const allClients = await db
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

  const allProjects = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      profile: projects.profile,
    })
    .from(projects)

  const projectsForLinking = opts.projectSlug
    ? allProjects.filter((p) => p.slug === opts.projectSlug)
    : allProjects

  return allClients
    .map((c) => ({
      ...c,
      linkedProjects: projectsForLinking.filter((p) => {
        const linkedClientIds = getLinkedClientIds(
          p.profile as Record<string, unknown>,
        )
        return linkedClientIds.includes(String(c.id))
      }),
    }))
    .filter((c) => !opts.projectSlug || c.linkedProjects.length > 0)
}

// ── CRUD ───────────────────────────────────────────────────────────────

export async function createClient(body: CreateClientInput) {
  const db = useDb()
  const [c] = await db.insert(clients).values(body).returning()
  return c
}

export async function updateClient(id: number, body: UpdateClientInput) {
  const db = useDb()
  const [c] = await db.update(clients).set(body).where(eq(clients.id, id)).returning()
  return c ?? null
}

/**
 * Remove a client and scrub every reference from `projects.profile` JSON:
 * drops `client_id` when it matches, and filters the numeric id out of
 * `client_ids[]`. Keeps the legacy denormalized profile in sync so UI
 * lists don't ghost-reference the deleted row.
 */
export async function deleteClient(id: number) {
  const db = useDb()

  const linkedById = await db
    .select({ id: projects.id, profile: projects.profile })
    .from(projects)
    .where(sql`${projects.profile}->>'client_id' = ${String(id)}`)

  for (const proj of linkedById) {
    const profile = (proj.profile || {}) as Record<string, unknown>
    delete profile.client_id
    await db
      .update(projects)
      .set({ profile: profile as unknown as Record<string, string> })
      .where(eq(projects.id, proj.id))
  }

  const linkedByArray = await db
    .select({ id: projects.id, profile: projects.profile })
    .from(projects)
    .where(sql`${projects.profile}->'client_ids' @> ${JSON.stringify([id])}::jsonb`)

  for (const proj of linkedByArray) {
    const profile = (proj.profile || {}) as Record<string, unknown>
    if (Array.isArray(profile.client_ids)) {
      profile.client_ids = (profile.client_ids as unknown[]).filter(
        (cid) => Number(cid) !== id,
      )
    }
    await db
      .update(projects)
      .set({ profile: profile as unknown as Record<string, string> })
      .where(eq(projects.id, proj.id))
  }

  await db.delete(clients).where(eq(clients.id, id))
}

// ── Client-scoped documents ───────────────────────────────────────────

const CLIENT_DOC_DIR = join(process.cwd(), 'public', 'uploads', 'client-docs')
const clientCategoryPrefix = (clientId: number) => `client:${clientId}:`

/**
 * List all documents filed under a client. We reuse the single `documents`
 * table and encode the client scope in `category` as `client:<id>:<kind>`
 * combined with `projectId IS NULL`. The real-world `kind` is stripped
 * from the prefix before returning so the UI sees a plain category.
 */
export async function listClientDocuments(clientId: number) {
  const db = useDb()
  const prefix = clientCategoryPrefix(clientId)
  const rows = await db
    .select()
    .from(documents)
    .where(and(like(documents.category, `${prefix}%`), isNull(documents.projectId)))
    .orderBy(documents.createdAt)

  return rows.map((row) => ({
    ...row,
    category: row.category.replace(prefix, ''),
  }))
}

export interface UploadClientDocumentInput {
  clientId: number
  fileData: Buffer | Uint8Array
  filename: string | undefined
  mimeType: string | undefined
  title: string
  kind: string
  notes: string | null
}

/**
 * Validates and writes an uploaded file into `public/uploads/client-docs/`,
 * then creates a `documents` row with the client-scoped category prefix.
 * Returns the row with the stripped category so the handler can send it
 * back directly.
 */
export async function uploadClientDocument(input: UploadClientDocumentInput) {
  const validation = validateUploadedFile(input.fileData, input.filename, input.mimeType)
  if (!validation.valid) {
    throw createError({ statusCode: 400, message: validation.error })
  }

  const ext = extname(input.filename || '.pdf')
  const filename = `client_${input.clientId}_${randomUUID()}${ext}`
  await mkdir(CLIENT_DOC_DIR, { recursive: true })
  await writeFile(join(CLIENT_DOC_DIR, filename), input.fileData)

  const url = `/uploads/client-docs/${filename}`
  const db = useDb()
  const [doc] = await db
    .insert(documents)
    .values({
      projectId: null,
      category: `${clientCategoryPrefix(input.clientId)}${input.kind}`,
      title: input.title,
      filename,
      url,
      notes: input.notes,
    })
    .returning()

  return { ...doc, category: input.kind }
}

/**
 * Delete a client-scoped document. Verifies the document belongs to this
 * client via the category prefix before removing the row and unlinking
 * the file.
 */
export async function deleteClientDocument(clientId: number, docId: number) {
  const db = useDb()
  const [doc] = await db
    .select()
    .from(documents)
    .where(
      and(
        eq(documents.id, docId),
        like(documents.category, `${clientCategoryPrefix(clientId)}%`),
        isNull(documents.projectId),
      ),
    )
    .limit(1)

  if (!doc) return null

  if (doc.filename) {
    try {
      await unlink(join(CLIENT_DOC_DIR, doc.filename))
    } catch {
      // ignore — file may already be gone
    }
  }

  await db.delete(documents).where(eq(documents.id, docId))
  return doc
}

// ── Client ↔ Project linking ──────────────────────────────────────────

/**
 * Link a client to a project by appending the id to `profile.client_ids`
 * and merging the canonical identity fields (`client_id`, `client_name`,
 * `client_phone`, etc.) into the project profile. Idempotent — a second
 * call is a no-op. Falls through to 404 if either side does not exist.
 */
export async function linkClientToProject(clientId: number, projectSlug: string) {
  const db = useDb()

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId))
  if (!client) throw createError({ statusCode: 404, statusMessage: 'Client not found' })

  const [project] = await db.select().from(projects).where(eq(projects.slug, projectSlug))
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  const currentProfile = (project.profile as Record<string, unknown>) || {}
  const currentClientIds = Array.isArray(currentProfile.client_ids)
    ? (currentProfile.client_ids as unknown[]).map((id) => String(id)).filter(Boolean)
    : []
  const nextClientIds = Array.from(new Set([...currentClientIds, String(client.id)]))

  const updatedProfile: Record<string, unknown> = {
    ...currentProfile,
    client_ids: nextClientIds,
    client_id: String(client.id),
    client_name: client.name,
    ...(client.phone && { client_phone: client.phone }),
    ...(client.email && { client_email: client.email }),
    ...(client.address && {
      objectAddress: currentProfile.objectAddress || client.address,
    }),
    ...(client.messenger && { client_messenger: client.messenger }),
    ...(client.messengerNick && { client_messenger_nick: client.messengerNick }),
  }

  const [updated] = await db
    .update(projects)
    .set({
      profile: updatedProfile as unknown as Record<string, string>,
      updatedAt: new Date(),
    })
    .where(eq(projects.slug, projectSlug))
    .returning()

  return { client, project: updated }
}

/**
 * Remove a client from a project's profile. If the removed client was the
 * primary (`profile.client_id`), promotes the next id in `client_ids[]`,
 * or clears all denormalized client fields when nobody remains.
 */
export async function unlinkClientFromProject(clientId: number, projectSlug: string) {
  const db = useDb()

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId))
  if (!client) throw createError({ statusCode: 404, statusMessage: 'Client not found' })

  const [project] = await db.select().from(projects).where(eq(projects.slug, projectSlug))
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  const currentProfile = (project.profile as Record<string, unknown>) || {}
  const currentClientIds = Array.isArray(currentProfile.client_ids)
    ? (currentProfile.client_ids as unknown[]).map((id) => String(id)).filter(Boolean)
    : []
  const nextClientIds = currentClientIds.filter((id) => id !== String(client.id))

  const updatedProfile: Record<string, unknown> = {
    ...currentProfile,
    client_ids: nextClientIds,
  }

  if (currentProfile.client_id === String(client.id)) {
    if (nextClientIds.length > 0) {
      updatedProfile.client_id = nextClientIds[0]
    } else {
      delete updatedProfile.client_id
      delete updatedProfile.client_name
      delete updatedProfile.client_phone
      delete updatedProfile.client_email
      delete updatedProfile.client_messenger
      delete updatedProfile.client_messenger_nick
    }
  }

  const [updated] = await db
    .update(projects)
    .set({
      profile: updatedProfile as unknown as Record<string, string>,
      updatedAt: new Date(),
    })
    .where(eq(projects.slug, projectSlug))
    .returning()

  return { client, project: updated }
}
