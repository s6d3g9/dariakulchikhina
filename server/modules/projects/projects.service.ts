import * as repo from '~/server/modules/projects/projects.repository'

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
  return repo.findProjectById(projectId)
}

export async function listProjectsWithTaskStats(): Promise<ProjectListItem[]> {
  const rows = await repo.listProjectsWithTaskStats()
  return rows.map(row => ({
    ...row,
    taskTotal: row.taskTotal ?? 0,
    taskDone: row.taskDone ?? 0,
    taskOverdue: row.taskOverdue ?? 0,
  }))
}

export async function getProjectBySlug(slug: string) {
  return repo.findProjectIdBySlug(slug)
}

export async function getProjectDetailBySlug(slug: string): Promise<ProjectDetail | null> {
  return repo.findProjectDetailBySlug(slug)
}

export async function getProjectWorkStatusBySlug(slug: string): Promise<ProjectWorkStatusItem[] | null> {
  const project = await repo.findProjectIdBySlug(slug)
  if (!project) {
    return null
  }

  const items = await repo.findProjectWorkStatusByProjectId(project.id)

  if (!items.length) {
    return []
  }

  const photoCounts = await repo.getWorkStatusPhotoCounts(project.id)
  const commentCounts = await repo.getWorkStatusCommentCounts(project.id)

  const photoMap = new Map<number, number>(photoCounts.map(row => [row.itemId, row.count ?? 0]))
  const commentMap = new Map<number, number>(commentCounts.map(row => [row.itemId, row.count ?? 0]))

  return items.map(item => ({
    ...item,
    photoCount: photoMap.get(item.id) ?? 0,
    commentCount: commentMap.get(item.id) ?? 0,
  }))
}
