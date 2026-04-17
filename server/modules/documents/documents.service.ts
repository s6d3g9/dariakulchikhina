import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { eq, desc, inArray } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import {
  documents,
  projects,
  clients,
  contractors,
  projectContractors,
  pageContent,
} from '~/server/db/schema'
import { getUploadDir } from '~/server/utils/storage'

const DocumentCategory = z.enum([
  'contract',
  'contract_supply',
  'contract_work',
  'act',
  'act_defect',
  'invoice',
  'estimate',
  'specification',
  'tz',
  'approval',
  'warranty',
  'photo_report',
  'correspondence',
  'template',
  'other',
])
export type DocumentCategoryInput = z.infer<typeof DocumentCategory>

export const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(500).transform((s) => s.trim()),
  category: DocumentCategory.default('other'),
  filename: z.string().max(500).nullable().optional(),
  url: z.string().max(1000).nullable().optional(),
  projectSlug: z.string().max(200).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  content: z.string().nullable().optional(),
  templateKey: z.string().max(100).nullable().optional(),
})
export type CreateDocumentInput = z.infer<typeof CreateDocumentSchema>

export const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(500).transform((s) => s.trim()).optional(),
  category: DocumentCategory.optional(),
  filename: z.string().max(500).nullable().optional(),
  url: z.string().max(1000).nullable().optional(),
  projectSlug: z.string().max(200).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  content: z.string().nullable().optional(),
  templateKey: z.string().max(100).nullable().optional(),
})
export type UpdateDocumentInput = z.infer<typeof UpdateDocumentSchema>

export interface ListDocumentsOptions {
  category?: string
  projectSlug?: string
}

/**
 * List documents, optionally filtered by project (via slug) and category.
 * When no projectSlug is given, returns every document with the project
 * title/slug joined in for UI convenience. Category is filtered in JS to
 * keep the where-clause simple across both branches.
 */
export async function listDocuments(opts: ListDocumentsOptions = {}) {
  const db = useDb()
  const category = opts.category ?? ''
  const projectSlug = opts.projectSlug ?? ''

  if (projectSlug) {
    const [project] = await db
      .select({ id: projects.id, title: projects.title })
      .from(projects)
      .where(eq(projects.slug, projectSlug))
      .limit(1)
    if (!project) return []

    let rows = await db
      .select()
      .from(documents)
      .where(eq(documents.projectId, project.id))
      .orderBy(desc(documents.createdAt))
    if (category) rows = rows.filter((r) => r.category === category)
    return rows
  }

  const joined = await db
    .select({
      doc: documents,
      projectTitle: projects.title,
      projectSlug: projects.slug,
    })
    .from(documents)
    .leftJoin(projects, eq(documents.projectId, projects.id))
    .orderBy(desc(documents.createdAt))

  let rows = joined.map((r) => ({
    ...r.doc,
    projectTitle: r.projectTitle ?? null,
    projectSlug: r.projectSlug ?? null,
  }))
  if (category) rows = rows.filter((r) => r.category === category)
  return rows
}

/**
 * Insert a new document row. If `projectSlug` is provided, resolves it to
 * `projectId`; an unknown slug silently falls through to `projectId = null`
 * (matches the legacy behavior — the UI lets admins file documents without
 * attaching them to a project).
 */
export async function createDocument(body: CreateDocumentInput) {
  const db = useDb()

  let projectId: number | null = null
  if (body.projectSlug) {
    const [proj] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, body.projectSlug))
      .limit(1)
    projectId = proj?.id ?? null
  }

  const [doc] = await db
    .insert(documents)
    .values({
      title: body.title,
      category: body.category,
      filename: body.filename || null,
      url: body.url || null,
      projectId,
      notes: body.notes || null,
      content: body.content || null,
      templateKey: body.templateKey || null,
    })
    .returning()

  return doc
}

/**
 * Fetch a single document by id. Returns null when the row is missing so
 * the handler can decide the 404 mapping.
 */
export async function getDocument(id: number) {
  const db = useDb()
  const [doc] = await db.select().from(documents).where(eq(documents.id, id)).limit(1)
  return doc ?? null
}

/**
 * Partial-update a document. Only the fields present in `body` are set.
 * `projectSlug` is resolved to `projectId` (empty string clears the link).
 * Throws 400 when no updatable fields are present.
 */
export async function updateDocument(id: number, body: UpdateDocumentInput) {
  const db = useDb()

  const updates: Record<string, unknown> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.category !== undefined) updates.category = body.category
  if (body.filename !== undefined) updates.filename = body.filename
  if (body.url !== undefined) updates.url = body.url
  if (body.notes !== undefined) updates.notes = body.notes
  if (body.content !== undefined) updates.content = body.content
  if (body.templateKey !== undefined) updates.templateKey = body.templateKey

  if (body.projectSlug !== undefined) {
    if (body.projectSlug) {
      const [proj] = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.slug, body.projectSlug))
        .limit(1)
      updates.projectId = proj?.id ?? null
    } else {
      updates.projectId = null
    }
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })
  }

  const [doc] = await db.update(documents).set(updates).where(eq(documents.id, id)).returning()
  return doc ?? null
}

/**
 * Delete a document by id and clean up any attached file from the upload
 * directory. Returns null when the document doesn't exist, so the handler
 * can return 404 without hiding the error path.
 */
export async function deleteDocument(id: number) {
  const db = useDb()
  const [deleted] = await db.delete(documents).where(eq(documents.id, id)).returning()
  if (!deleted) return null

  if (deleted.filename) {
    const fn = path.basename(deleted.filename)
    if (fn && !fn.includes('..')) {
      try {
        await unlink(path.join(getUploadDir(), fn))
      } catch {
        // file may already be deleted — ignore
      }
    }
  }

  return deleted
}

export interface DocumentContext {
  project: Record<string, unknown> | null
  clients: unknown[]
  contractors: unknown[]
  today: string
}

/**
 * Assembles the aggregate context used to auto-populate document
 * templates: a flattened project snapshot, linked clients (from profile
 * client_ids / client_id), and linked contractors (via projectContractors).
 * Without a projectSlug, returns the full clients and contractors lists
 * so the UI can offer manual selection.
 */
export async function getDocumentContext(projectSlug: string): Promise<DocumentContext> {
  const db = useDb()
  const result: DocumentContext = {
    project: null,
    clients: [],
    contractors: [],
    today: new Date().toLocaleDateString('ru-RU'),
  }

  if (!projectSlug) {
    result.clients = await db.select().from(clients).orderBy(clients.name)
    result.contractors = await db.select().from(contractors).orderBy(contractors.name)
    return result
  }

  const [proj] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, projectSlug))
    .limit(1)
  if (!proj) return result

  const profile = (proj.profile || {}) as Record<string, unknown>
  const projectView: Record<string, unknown> = {
    id: proj.id,
    slug: proj.slug,
    title: proj.title,
    status: proj.status,
    client_name: profile.client_name || profile.fio || '',
    phone: profile.phone || '',
    email: profile.email || '',
    objectAddress: profile.objectAddress || '',
    objectType: profile.objectType || '',
    objectArea: profile.objectArea || '',
    roomCount: profile.roomCount || '',
    budget: profile.budget || '',
    deadline: profile.deadline || '',
    floor: profile.floor || '',
    messenger: profile.messenger || '',
    messengerNick: profile.messengerNick || '',
    passport_series: profile.passport_series || '',
    passport_number: profile.passport_number || '',
    passport_issued_by: profile.passport_issued_by || '',
    passport_issue_date: profile.passport_issue_date || '',
    passport_department_code: profile.passport_department_code || '',
    passport_birth_place: profile.passport_birth_place || '',
    passport_registration_address: profile.passport_registration_address || '',
    passport_inn: profile.passport_inn || '',
    passport_snils: profile.passport_snils || '',
    _profile: profile,
  }

  const pageRows = await db
    .select()
    .from(pageContent)
    .where(eq(pageContent.projectId, proj.id))

  for (const pg of pageRows) {
    const content = (pg.content || {}) as Record<string, unknown>
    if (pg.pageSlug === 'first-contact' || pg.pageSlug === 'smart-brief') {
      for (const [k, v] of Object.entries(content)) {
        if (v && typeof v === 'string' && !projectView[k]) {
          projectView[k] = v
        }
      }
    }
  }
  result.project = projectView

  const clientIds: number[] = []
  if (Array.isArray(profile.client_ids)) {
    clientIds.push(...(profile.client_ids as unknown[]).map(Number).filter(Boolean))
  }
  if (profile.client_id) {
    const cid = Number(profile.client_id)
    if (cid && !clientIds.includes(cid)) clientIds.push(cid)
  }

  if (clientIds.length) {
    result.clients = await db.select().from(clients).where(inArray(clients.id, clientIds))
  } else {
    result.clients = await db.select().from(clients).orderBy(clients.name)
  }

  const pcRows = await db
    .select({ contractorId: projectContractors.contractorId })
    .from(projectContractors)
    .where(eq(projectContractors.projectId, proj.id))

  const contractorIds = pcRows.map((r) => r.contractorId)
  if (contractorIds.length) {
    result.contractors = await db
      .select()
      .from(contractors)
      .where(inArray(contractors.id, contractorIds))
  } else {
    result.contractors = await db.select().from(contractors).orderBy(contractors.name)
  }

  return result
}
