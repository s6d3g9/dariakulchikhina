import { writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import {
  workStatusItems,
  workStatusItemPhotos,
  workStatusItemComments,
  projects,
  contractors,
} from '~/server/db/schema'
import { ensureUploadDir, getUploadDir, getUploadUrl } from '~/server/utils/storage'
import { validateUploadedFile } from '~/server/utils/upload-validation'
import { resolveContractorAndStaffIds } from './contractors.service'

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
  const db = useDb()
  const staff = await db
    .select({ id: contractors.id, name: contractors.name })
    .from(contractors)
    .where(eq(contractors.parentId, contractorId))

  const staffMap = Object.fromEntries(staff.map((s) => [s.id, s.name]))
  const allIds = [contractorId, ...staff.map((s) => s.id)]

  const items = await db
    .select({
      id: workStatusItems.id,
      title: workStatusItems.title,
      workType: workStatusItems.workType,
      status: workStatusItems.status,
      dateStart: workStatusItems.dateStart,
      dateEnd: workStatusItems.dateEnd,
      budget: workStatusItems.budget,
      notes: workStatusItems.notes,
      sortOrder: workStatusItems.sortOrder,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      contractorId: workStatusItems.contractorId,
    })
    .from(workStatusItems)
    .innerJoin(projects, eq(workStatusItems.projectId, projects.id))
    .where(inArray(workStatusItems.contractorId, allIds))
    .orderBy(workStatusItems.sortOrder)

  if (!items.length) return []

  const itemIds = items.map((i) => i.id)

  const photoCounts = await db
    .select({
      itemId: workStatusItemPhotos.itemId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(workStatusItemPhotos)
    .where(inArray(workStatusItemPhotos.itemId, itemIds))
    .groupBy(workStatusItemPhotos.itemId)

  const commentCounts = await db
    .select({
      itemId: workStatusItemComments.itemId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(workStatusItemComments)
    .where(inArray(workStatusItemComments.itemId, itemIds))
    .groupBy(workStatusItemComments.itemId)

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
  const db = useDb()
  const targetId = body.contractorId

  if (targetId !== companyId) {
    const [master] = await db
      .select({ id: contractors.id })
      .from(contractors)
      .where(and(eq(contractors.id, targetId), eq(contractors.parentId, companyId)))
      .limit(1)
    if (!master) {
      throw createError({ statusCode: 403, statusMessage: 'Contractor not in staff' })
    }
  }

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, body.projectSlug))
    .limit(1)
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const [item] = await db
    .insert(workStatusItems)
    .values({
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
    .returning()
  return item
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
  const db = useDb()
  const allIds = await resolveContractorAndStaffIds(contractorId)

  const [updated] = await db
    .update(workStatusItems)
    .set(body)
    .where(
      and(
        eq(workStatusItems.id, itemId),
        inArray(workStatusItems.contractorId, allIds),
      ),
    )
    .returning()
  return updated ?? null
}

/**
 * Verify that the given item belongs to the contractor's scope, then
 * return its id. Throws 403 when it doesn't — shared helper for the
 * comment/photo endpoints.
 */
async function assertContractorOwnsItem(contractorId: number, itemId: number) {
  const db = useDb()
  const allIds = await resolveContractorAndStaffIds(contractorId)
  const [item] = await db
    .select({ id: workStatusItems.id })
    .from(workStatusItems)
    .where(
      and(
        eq(workStatusItems.id, itemId),
        inArray(workStatusItems.contractorId, allIds),
      ),
    )
    .limit(1)
  if (!item) throw createError({ statusCode: 403 })
  return item
}

export async function listWorkItemComments(contractorId: number, itemId: number) {
  await assertContractorOwnsItem(contractorId, itemId)
  const db = useDb()
  return db
    .select()
    .from(workStatusItemComments)
    .where(eq(workStatusItemComments.itemId, itemId))
    .orderBy(workStatusItemComments.createdAt)
}

export async function addWorkItemComment(
  contractorId: number,
  itemId: number,
  text: string,
) {
  await assertContractorOwnsItem(contractorId, itemId)
  const db = useDb()
  const [contractor] = await db
    .select({ name: contractors.name })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1)

  const [comment] = await db
    .insert(workStatusItemComments)
    .values({
      itemId,
      authorType: 'contractor',
      authorName: contractor?.name ?? 'Подрядчик',
      text,
    })
    .returning()
  return comment
}

export async function listWorkItemPhotos(contractorId: number, itemId: number) {
  await assertContractorOwnsItem(contractorId, itemId)
  const db = useDb()
  return db
    .select()
    .from(workStatusItemPhotos)
    .where(eq(workStatusItemPhotos.itemId, itemId))
    .orderBy(workStatusItemPhotos.createdAt)
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

  const db = useDb()
  const [photo] = await db
    .insert(workStatusItemPhotos)
    .values({
      itemId: input.itemId,
      contractorId: input.contractorId,
      url,
      caption: input.caption,
    })
    .returning()
  return photo
}

export async function deleteWorkItemPhoto(
  contractorId: number,
  itemId: number,
  photoId: number,
) {
  await assertContractorOwnsItem(contractorId, itemId)
  const db = useDb()
  const [photo] = await db
    .delete(workStatusItemPhotos)
    .where(
      and(
        eq(workStatusItemPhotos.id, photoId),
        eq(workStatusItemPhotos.itemId, itemId),
      ),
    )
    .returning()
  if (!photo) return null

  try {
    const filename = path.basename(photo.url)
    if (filename && !filename.includes('..')) {
      await unlink(path.join(getUploadDir(), filename))
    }
  } catch {
    // ignore — file may already be gone
  }
  return photo
}
