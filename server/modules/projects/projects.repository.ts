import { eq, inArray, placeholder, sql } from 'drizzle-orm'

import { useDb } from '~/server/db/index'
import {
  contractors,
  documents,
  projects,
  uploads,
  workStatusItemComments,
  workStatusItemPhotos,
  workStatusItems,
} from '~/server/db/schema'

// ── From projects.service.ts ───────────────────────────────────────────

export async function findProjectById(id: number) {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
    })
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1)
  return project ?? null
}

export async function listProjectsWithTaskStats() {
  const db = useDb()
  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      pages: projects.pages,
      createdAt: projects.createdAt,
      taskTotal: sql<number>`cast(count(${workStatusItems.id}) as int)`,
      taskDone: sql<number>`cast(sum(case when ${workStatusItems.status} = 'done' then 1 else 0 end) as int)`,
      taskOverdue: sql<number>`cast(sum(case when ${workStatusItems.status} not in ('done','cancelled') and ${workStatusItems.dateEnd} is not null and ${workStatusItems.dateEnd} < current_date::text then 1 else 0 end) as int)`,
    })
    .from(projects)
    .leftJoin(workStatusItems, eq(workStatusItems.projectId, projects.id))
    .groupBy(projects.id)
    .orderBy(projects.createdAt)
    .prepare('projects_list_with_task_stats_v5')
    .execute()
  return rows
}

export async function findProjectIdBySlug(slug: string) {
  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, placeholder('slug')))
    .limit(1)
    .prepare('projects_get_by_slug_v5')
    .execute({ slug })
  return project ?? null
}

export async function findProjectDetailBySlug(slug: string) {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      userId: projects.userId,
      pages: projects.pages,
      profile: projects.profile,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, placeholder('slug')))
    .limit(1)
    .prepare('projects_get_detail_by_slug_v5')
    .execute({ slug })
  return project ?? null
}

export async function findProjectWorkStatusByProjectId(projectId: number) {
  const db = useDb()
  const items = await db
    .select({
      id: workStatusItems.id,
      title: workStatusItems.title,
      status: workStatusItems.status,
      workType: workStatusItems.workType,
      contractorId: workStatusItems.contractorId,
      contractorName: contractors.name,
      dateStart: workStatusItems.dateStart,
      dateEnd: workStatusItems.dateEnd,
      budget: workStatusItems.budget,
      notes: workStatusItems.notes,
      sortOrder: workStatusItems.sortOrder,
    })
    .from(workStatusItems)
    .leftJoin(contractors, eq(workStatusItems.contractorId, contractors.id))
    .where(eq(workStatusItems.projectId, placeholder('projectId')))
    .orderBy(workStatusItems.sortOrder)
    .prepare('projects_work_status_items_by_project_v5')
    .execute({ projectId })
  return items
}

export async function getWorkStatusPhotoCounts(projectId: number) {
  const db = useDb()
  const rows = await db
    .select({
      itemId: workStatusItemPhotos.itemId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(workStatusItemPhotos)
    .innerJoin(workStatusItems, eq(workStatusItemPhotos.itemId, workStatusItems.id))
    .where(eq(workStatusItems.projectId, placeholder('projectId')))
    .groupBy(workStatusItemPhotos.itemId)
    .prepare('projects_work_status_photo_counts_by_project_v5')
    .execute({ projectId })
  return rows
}

export async function getWorkStatusCommentCounts(projectId: number) {
  const db = useDb()
  const rows = await db
    .select({
      itemId: workStatusItemComments.itemId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(workStatusItemComments)
    .innerJoin(workStatusItems, eq(workStatusItemComments.itemId, workStatusItems.id))
    .where(eq(workStatusItems.projectId, placeholder('projectId')))
    .groupBy(workStatusItemComments.itemId)
    .prepare('projects_work_status_comment_counts_by_project_v5')
    .execute({ projectId })
  return rows
}

// ── From project-mutations.service.ts ─────────────────────────────────

const projectReturning = {
  id: projects.id,
  slug: projects.slug,
  title: projects.title,
  status: projects.status,
  projectType: projects.projectType,
  userId: projects.userId,
  pages: projects.pages,
  profile: projects.profile,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
}

export async function insertProject(values: Record<string, unknown>) {
  const db = useDb()
  const [project] = await db
    .insert(projects)
    .values(values as typeof projects.$inferInsert)
    .returning(projectReturning)
  return project
}

export async function updateProjectBySlug(slug: string, updates: Record<string, unknown>) {
  const db = useDb()
  const [updated] = await db
    .update(projects)
    .set(updates as Record<string, unknown>)
    .where(eq(projects.slug, slug))
    .returning(projectReturning)
  return updated ?? null
}

export async function updateProjectStatusBySlug(slug: string, status: string) {
  const db = useDb()
  const [updated] = await db
    .update(projects)
    .set({ status, updatedAt: new Date() })
    .where(eq(projects.slug, slug))
    .returning(projectReturning)
  return updated ?? null
}

export async function findProjectForDelete(slug: string) {
  const db = useDb()
  const [proj] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return proj ?? null
}

export async function findProjectUploads(projectId: number) {
  const db = useDb()
  return db
    .select({ filename: uploads.filename })
    .from(uploads)
    .where(eq(uploads.projectId, projectId))
}

export async function findProjectWorkItemIds(projectId: number) {
  const db = useDb()
  return db
    .select({ id: workStatusItems.id })
    .from(workStatusItems)
    .where(eq(workStatusItems.projectId, projectId))
}

export async function findProjectWorkItemPhotosByItemIds(itemIds: number[]) {
  const db = useDb()
  if (!itemIds.length) return []
  return db
    .select({ url: workStatusItemPhotos.url })
    .from(workStatusItemPhotos)
    .where(inArray(workStatusItemPhotos.itemId, itemIds))
}

export async function nullifyDocumentsProjectId(projectId: number) {
  const db = useDb()
  await db
    .update(documents)
    .set({ projectId: null } as Record<string, unknown>)
    .where(eq(documents.projectId, projectId))
}

export async function deleteProjectById(id: number) {
  const db = useDb()
  await db.delete(projects).where(eq(projects.id, id))
}

export async function findProjectFull(slug: string) {
  const db = useDb()
  const [current] = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  return current ?? null
}

export async function updateProjectProfileBySlug(slug: string, profile: Record<string, string | null>) {
  const db = useDb()
  await db
    .update(projects)
    .set({
      profile: profile as unknown as Record<string, string>,
      updatedAt: new Date(),
    })
    .where(eq(projects.slug, slug))
}
