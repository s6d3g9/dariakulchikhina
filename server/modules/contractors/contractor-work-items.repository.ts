import { eq, and, inArray, sql } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import {
  workStatusItems,
  workStatusItemPhotos,
  workStatusItemComments,
  projects,
  contractors,
} from '~/server/db/schema'

export async function findProjectBySlug(slug: string) {
  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return project ?? null
}

export async function getContractorStaffInfo(contractorId: number) {
  const db = useDb()
  return db
    .select({ id: contractors.id, name: contractors.name })
    .from(contractors)
    .where(eq(contractors.parentId, contractorId))
}

export async function listWorkItemsForContractors(allIds: number[]) {
  const db = useDb()
  return db
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
}

export async function getPhotoCounts(itemIds: number[]) {
  const db = useDb()
  return db
    .select({
      itemId: workStatusItemPhotos.itemId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(workStatusItemPhotos)
    .where(inArray(workStatusItemPhotos.itemId, itemIds))
    .groupBy(workStatusItemPhotos.itemId)
}

export async function getCommentCounts(itemIds: number[]) {
  const db = useDb()
  return db
    .select({
      itemId: workStatusItemComments.itemId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(workStatusItemComments)
    .where(inArray(workStatusItemComments.itemId, itemIds))
    .groupBy(workStatusItemComments.itemId)
}

export async function findWorkItemInScope(itemId: number, allIds: number[]) {
  const db = useDb()
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
  return item ?? null
}

export async function insertWorkItem(values: {
  projectId: number
  contractorId: number
  title: string
  workType: string | null
  status: string
  dateStart: string | null
  dateEnd: string | null
  budget: string | null
  notes: string | null
  sortOrder: number
}) {
  const db = useDb()
  const [item] = await db.insert(workStatusItems).values(values).returning()
  return item
}

export async function updateWorkItemRow(
  itemId: number,
  allIds: number[],
  updates: Record<string, unknown>,
) {
  const db = useDb()
  const [updated] = await db
    .update(workStatusItems)
    .set(updates)
    .where(
      and(
        eq(workStatusItems.id, itemId),
        inArray(workStatusItems.contractorId, allIds),
      ),
    )
    .returning()
  return updated ?? null
}

export async function listWorkItemComments(itemId: number) {
  const db = useDb()
  return db
    .select()
    .from(workStatusItemComments)
    .where(eq(workStatusItemComments.itemId, itemId))
    .orderBy(workStatusItemComments.createdAt)
}

export async function findContractorName(contractorId: number) {
  const db = useDb()
  const [contractor] = await db
    .select({ name: contractors.name })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1)
  return contractor?.name ?? null
}

export async function insertWorkItemComment(values: {
  itemId: number
  authorType: string
  authorName: string
  text: string
}) {
  const db = useDb()
  const [comment] = await db.insert(workStatusItemComments).values(values).returning()
  return comment
}

export async function listWorkItemPhotos(itemId: number) {
  const db = useDb()
  return db
    .select()
    .from(workStatusItemPhotos)
    .where(eq(workStatusItemPhotos.itemId, itemId))
    .orderBy(workStatusItemPhotos.createdAt)
}

export async function insertWorkItemPhoto(values: {
  itemId: number
  contractorId: number
  url: string
  caption: string | null
}) {
  const db = useDb()
  const [photo] = await db.insert(workStatusItemPhotos).values(values).returning()
  return photo
}

export async function deleteWorkItemPhotoRow(photoId: number, itemId: number) {
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
  return photo ?? null
}

export async function findContractorStaffMemberInCompany(
  targetId: number,
  companyId: number,
) {
  const db = useDb()
  const [master] = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(and(eq(contractors.id, targetId), eq(contractors.parentId, companyId)))
    .limit(1)
  return master ?? null
}
