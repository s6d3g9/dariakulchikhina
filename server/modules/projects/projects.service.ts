import { eq, placeholder, sql } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { contractors, projects, workStatusItemComments, workStatusItemPhotos, workStatusItems } from '~/server/db/schema'

export type ProjectListItem = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  pages: string[]
  createdAt: Date | string
  taskTotal: number
  taskDone: number
  taskOverdue: number
}

export type ProjectDetail = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  userId: number | null
  pages: string[]
  profile: unknown
  createdAt: Date | string
  updatedAt: Date | string
}

export type ProjectWorkStatusItem = {
  id: number
  title: string
  status: string
  workType: string | null
  contractorId: number | null
  contractorName: string | null
  dateStart: string | null
  dateEnd: string | null
  budget: string | null
  notes: string | null
  sortOrder: number
  photoCount: number
  commentCount: number
}

export function isNumericProjectId(value: string) {
  return /^\d+$/.test(value)
}

export async function getProjectById(projectId: number) {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
    })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  return project ?? null
}

export async function listProjectsWithTaskStats(): Promise<ProjectListItem[]> {
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

  return rows.map(row => ({
    ...row,
    taskTotal: row.taskTotal ?? 0,
    taskDone: row.taskDone ?? 0,
    taskOverdue: row.taskOverdue ?? 0,
  }))
}

export async function getProjectBySlug(slug: string) {
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

export async function getProjectDetailBySlug(slug: string): Promise<ProjectDetail | null> {
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

export async function getProjectWorkStatusBySlug(slug: string): Promise<ProjectWorkStatusItem[] | null> {
  const db = useDb()
  const project = await getProjectBySlug(slug)
  if (!project) {
    return null
  }

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
    .execute({ projectId: project.id })

  if (!items.length) {
    return []
  }

  const photoCounts = await db
    .select({
      itemId: workStatusItemPhotos.itemId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(workStatusItemPhotos)
    .innerJoin(workStatusItems, eq(workStatusItemPhotos.itemId, workStatusItems.id))
    .where(eq(workStatusItems.projectId, placeholder('projectId')))
    .groupBy(workStatusItemPhotos.itemId)
    .prepare('projects_work_status_photo_counts_by_project_v5')
    .execute({ projectId: project.id })

  const commentCounts = await db
    .select({
      itemId: workStatusItemComments.itemId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(workStatusItemComments)
    .innerJoin(workStatusItems, eq(workStatusItemComments.itemId, workStatusItems.id))
    .where(eq(workStatusItems.projectId, placeholder('projectId')))
    .groupBy(workStatusItemComments.itemId)
    .prepare('projects_work_status_comment_counts_by_project_v5')
    .execute({ projectId: project.id })

  const photoMap = new Map<number, number>(photoCounts.map(row => [row.itemId, row.count ?? 0]))
  const commentMap = new Map<number, number>(commentCounts.map(row => [row.itemId, row.count ?? 0]))

  return items.map(item => ({
    ...item,
    photoCount: photoMap.get(item.id) ?? 0,
    commentCount: commentMap.get(item.id) ?? 0,
  }))
}