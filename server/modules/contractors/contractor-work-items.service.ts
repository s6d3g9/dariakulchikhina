import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { ensureUploadDir, getUploadDir, getUploadUrl } from '~/server/modules/uploads/upload-storage.service'
import { validateUploadedFile } from '~/server/modules/uploads/upload-validation.service'
import * as repo from './contractor-work-items.repository'
import * as contractorsRepo from './contractors.repository'

export const CreateWorkItemSchema = z.object({
  projectSlug: z.string(),
  contractorId: z.number(),
  title: z.string().min(1),
  workType: z.string().optional().nullable(),
  dateStart: z.string().optional().nullable(),
  dateEnd: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})
export type CreateWorkItemInput = z.infer<typeof CreateWorkItemSchema>

export const UpdateWorkItemSchema = z.object({
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
  dateStart: z.string().nullable().optional(),
  dateEnd: z.string().nullable().optional(),
})
export type UpdateWorkItemInput = z.infer<typeof UpdateWorkItemSchema>

export const CommentSchema = z.object({
  text: z.string().min(1).max(2000),
})
export type CommentInput = z.infer<typeof CommentSchema>

/**
 * List all work-items assigned to a contractor company OR any of its
 * staff (via parent_id). Adds per-item photo/comment counts in one
 * aggregate query and the staff member's name when the item is
 * delegated to a master.
 */
export async function listContractorWorkItems(contractorId: number) {
  const staff = await repo.getContractorStaffInfo(contractorId)
  const staffMap = Object.fromEntries(staff.map((s) => [s.id, s.name]))
  const allIds = [contractorId, ...staff.map((s) => s.id)]

  const items = await repo.listWorkItemsForContractors(allIds)
  if (!items.length) return []

  const itemIds = items.map((i) => i.id)
  const photoCounts = await repo.getPhotoCounts(itemIds)
  const commentCounts = await repo.getCommentCounts(itemIds)

  const photoCountMap = Object.fromEntries(photoCounts.map((r) => [r.itemId, r.count]))
  const commentCountMap = Object.fromEntries(
    commentCounts.map((r) => [r.itemId, r.count]),
  )

  return items.map((item) => ({
    ...item,
    assignedToName:
      item.contractorId !== null && item.contractorId !== contractorId
        ? staffMap[item.contractorId] ?? null
        : null,
    photoCount: photoCountMap[item.id] ?? 0,
    commentCount: commentCountMap[item.id] ?? 0,
  }))
}

/**
 * Create a work item. The target contractor must be either the company
 * itself or one of its staff; otherwise the call fails with 403. The
 * project slug is resolved to projectId in the same flow.
 */
export async function createWorkItem(companyId: number, body: CreateWorkItemInput) {
  const targetId = body.contractorId

  if (targetId !== companyId) {
    const master = await repo.findContractorStaffMemberInCompany(targetId, companyId)
    if (!master) {
      throw createError({ statusCode: 403, statusMessage: 'Contractor not in staff' })
    }
  }

  const project = await repo.findProjectBySlug(body.projectSlug)
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  return repo.insertWorkItem({
    projectId: project.id,
    contractorId: targetId,
    title: body.title,
    workType: body.workType || null,
    status: 'pending',
    dateStart: body.dateStart || null,
    dateEnd: body.dateEnd || null,
    budget: body.budget || null,
    notes: body.notes || null,
    sortOrder: 0,
  })
}

/**
 * Partial update scoped to the contractor's own items (including staff
 * items). Returns null when the id does not match, so the handler
 * maps to 404 explicitly.
 */
export async function updateWorkItem(
  contractorId: number,
  itemId: number,
  body: UpdateWorkItemInput,
) {
  const allIds = await contractorsRepo.resolveContractorAndStaffIds(contractorId)
  return repo.updateWorkItemRow(itemId, allIds, body)
}

/**
 * Verify that the given item belongs to the contractor's scope, then
 * return its id. Throws 403 when it doesn't — shared helper for the
 * comment/photo endpoints.
 */
async function assertContractorOwnsItem(contractorId: number, itemId: number) {
  const allIds = await contractorsRepo.resolveContractorAndStaffIds(contractorId)
  const item = await repo.findWorkItemInScope(itemId, allIds)
  if (!item) throw createError({ statusCode: 403 })
  return item
}

export async function listWorkItemComments(contractorId: number, itemId: number) {
  await assertContractorOwnsItem(contractorId, itemId)
  return repo.listWorkItemComments(itemId)
}

export async function addWorkItemComment(
  contractorId: number,
  itemId: number,
  text: string,
) {
  await assertContractorOwnsItem(contractorId, itemId)
  const name = await repo.findContractorName(contractorId)

  return repo.insertWorkItemComment({
    itemId,
    authorType: 'contractor',
    authorName: name ?? 'Подрядчик',
    text,
  })
}

export async function listWorkItemPhotos(contractorId: number, itemId: number) {
  await assertContractorOwnsItem(contractorId, itemId)
  return repo.listWorkItemPhotos(itemId)
}

export interface UploadWorkItemPhotoInput {
  contractorId: number
  itemId: number
  fileData: Buffer | Uint8Array
  filename: string | undefined
  mimeType: string | undefined
  caption: string | null
}

export async function uploadWorkItemPhoto(input: UploadWorkItemPhotoInput) {
  await assertContractorOwnsItem(input.contractorId, input.itemId)

  const validation = validateUploadedFile(
    input.fileData,
    input.filename,
    input.mimeType,
  )
  if (!validation.valid) {
    throw createError({
      statusCode: 400,
      statusMessage: validation.error || 'Invalid file',
    })
  }

  const dir = await ensureUploadDir()
  const ext = path.extname(input.filename || '.jpg')
  const filename = `${randomUUID()}${ext}`
  await writeFile(path.join(dir, filename), input.fileData)
  const url = getUploadUrl(filename)

  return repo.insertWorkItemPhoto({
    itemId: input.itemId,
    contractorId: input.contractorId,
    url,
    caption: input.caption,
  })
}

export async function deleteWorkItemPhoto(
  contractorId: number,
  itemId: number,
  photoId: number,
) {
  await assertContractorOwnsItem(contractorId, itemId)

  const photo = await repo.deleteWorkItemPhotoRow(photoId, itemId)
  if (!photo) return null

  try {
    const filename = path.basename(photo.url)
    if (filename && !filename.includes('..')) {
      const { unlink } = await import('node:fs/promises')
      await unlink(path.join(getUploadDir(), filename))
    }
  } catch {
    // ignore — file may already be gone
  }
  return photo
}
