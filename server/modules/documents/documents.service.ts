import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { getUploadDir } from '~/server/modules/uploads/upload-storage.service'
import * as repo from './documents.repository'
import type { CreateDocumentInput, UpdateDocumentInput, ListDocumentsOptions, DocumentContext } from './documents.types'

export * from './documents.types'

/**
 * List documents, optionally filtered by project (via slug) and category.
 * When no projectSlug is given, returns every document with the project
 * title/slug joined in for UI convenience. Category is filtered in JS to
 * keep the where-clause simple across both branches.
 */
export async function listDocuments(opts: ListDocumentsOptions = {}) {
  const category = opts.category ?? ''
  const projectSlug = opts.projectSlug ?? ''

  if (projectSlug) {
    const project = await repo.findProjectBySlug(projectSlug)
    if (!project) return []

    let rows = await repo.listDocumentsByProjectId(project.id)
    if (category) rows = rows.filter((r) => r.category === category)
    return rows
  }

  let rows = await repo.listAllDocumentsWithProject()
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
  let projectId: number | null = null
  if (body.projectSlug) {
    const proj = await repo.findProjectBySlug(body.projectSlug)
    projectId = proj?.id ?? null
  }

  return repo.insertDocument({
    title: body.title,
    category: body.category,
    filename: body.filename || null,
    url: body.url || null,
    projectId,
    notes: body.notes || null,
    content: body.content || null,
    templateKey: body.templateKey || null,
  })
}

/**
 * Fetch a single document by id. Returns null when the row is missing so
 * the handler can decide the 404 mapping.
 */
export async function getDocument(id: number) {
  return repo.findDocumentById(id)
}

/**
 * Partial-update a document. Only the fields present in `body` are set.
 * `projectSlug` is resolved to `projectId` (empty string clears the link).
 * Throws 400 when no updatable fields are present.
 */
export async function updateDocument(id: number, body: UpdateDocumentInput) {
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
      const proj = await repo.findProjectBySlug(body.projectSlug)
      updates.projectId = proj?.id ?? null
    } else {
      updates.projectId = null
    }
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })
  }

  return repo.updateDocumentRow(id, updates)
}

/**
 * Delete a document by id and clean up any attached file from the upload
 * directory. Returns null when the document doesn't exist, so the handler
 * can return 404 without hiding the error path.
 */
export async function deleteDocument(id: number) {
  const deleted = await repo.deleteDocumentRow(id)
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

/**
 * Assembles the aggregate context used to auto-populate document
 * templates: a flattened project snapshot, linked clients (from profile
 * client_ids / client_id), and linked contractors (via projectContractors).
 * Without a projectSlug, returns the full clients and contractors lists
 * so the UI can offer manual selection.
 */
export async function getDocumentContext(projectSlug: string): Promise<DocumentContext> {
  const result: DocumentContext = {
    project: null,
    clients: [],
    contractors: [],
    today: new Date().toLocaleDateString('ru-RU'),
  }

  if (!projectSlug) {
    result.clients = await repo.listAllClients()
    result.contractors = await repo.listAllContractors()
    return result
  }

  const proj = await repo.findProjectBySlug(projectSlug)
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

  const pageRows = await repo.listPageContentByProjectId(proj.id)

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
    result.clients = await repo.listClientsByIds(clientIds)
  } else {
    result.clients = await repo.listAllClients()
  }

  const contractorIds = await repo.listProjectContractorIds(proj.id)
  if (contractorIds.length) {
    result.contractors = await repo.listContractorsByIds(contractorIds)
  } else {
    result.contractors = await repo.listAllContractors()
  }

  return result
}
