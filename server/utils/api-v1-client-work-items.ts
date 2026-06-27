import {
  normalizeWorkStatus,
  workStatusLabel,
  workTypeLabel,
  type CanonicalWorkStatus,
} from '~/shared/utils/work-status'
import type {
  ApiV1ClientProjectWorkItem,
  ApiV1ClientProjectWorkItems,
  ApiV1ClientProjectWorkItemsSummary,
  ApiV1ClientWorkItemStatus,
  ApiV1ProjectRef,
} from '~/shared/types/api-v1'

type ProjectWorkItemsRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  updatedAt: Date | string | null
}

type WorkItemRow = {
  id: number
  title: string
  status: string
  workType: string | null
  contractorName: string | null
  contractorCompanyName: string | null
  dateStart: string | null
  dateEnd: string | null
  sortOrder: number
}

const FUTURE_WORKER_STATUS_TO_CLIENT_STATUS: Record<string, CanonicalWorkStatus> = {
  assigned: 'planned',
  accepted: 'planned',
  ready_for_review: 'in_progress',
  needs_fix: 'in_progress',
  blocked: 'paused',
}

function safeString(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function createProjectRef(project: ProjectWorkItemsRow): ApiV1ProjectRef {
  const updatedAt = project.updatedAt instanceof Date
    ? project.updatedAt.toISOString()
    : safeString(project.updatedAt, 80)

  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    updatedAt,
  }
}

function normalizeClientWorkItemStatus(status: string | null): ApiV1ClientWorkItemStatus {
  const normalizedRaw = safeString(status, 80).toLowerCase().replace(/[\s-]+/g, '_')
  return (FUTURE_WORKER_STATUS_TO_CLIENT_STATUS[normalizedRaw] || normalizeWorkStatus(status)) as ApiV1ClientWorkItemStatus
}

function isOverdue(item: Pick<ApiV1ClientProjectWorkItem, 'status' | 'dateEnd'>) {
  if (!item.dateEnd) return false
  if (item.status === 'done' || item.status === 'cancelled' || item.status === 'skipped') return false
  return item.dateEnd < new Date().toISOString().slice(0, 10)
}

function createWorkItem(row: WorkItemRow, photoCountByItemId: Record<number, number>): ApiV1ClientProjectWorkItem {
  const workType = safeString(row.workType, 120)
  const status = normalizeClientWorkItemStatus(row.status)
  const item = {
    id: row.id,
    title: safeString(row.title, 240) || 'Работа',
    workType,
    workTypeLabel: workType ? workTypeLabel(workType) : '',
    status,
    statusLabel: workStatusLabel(status),
    dateStart: safeString(row.dateStart, 40),
    dateEnd: safeString(row.dateEnd, 40),
    responsibleName: safeString(row.contractorCompanyName || row.contractorName, 240),
    photoCount: Math.max(0, Number(photoCountByItemId[row.id] || 0)),
    overdue: false,
    sortOrder: row.sortOrder,
  }

  return {
    ...item,
    overdue: isOverdue(item),
  }
}

function createSummary(items: ApiV1ClientProjectWorkItem[]): ApiV1ClientProjectWorkItemsSummary {
  const total = items.length
  const completed = items.filter(item => item.status === 'done').length
  const active = items.filter(item => item.status === 'in_progress').length
  const planned = items.filter(item => item.status === 'pending' || item.status === 'planned').length
  const paused = items.filter(item => item.status === 'paused').length
  const cancelled = items.filter(item => item.status === 'cancelled' || item.status === 'skipped').length
  const overdue = items.filter(item => item.overdue).length
  const nextItem = items.find(item => item.status !== 'done' && item.status !== 'cancelled' && item.status !== 'skipped')

  return {
    total,
    completed,
    active,
    planned,
    paused,
    cancelled,
    overdue,
    progressPercent: total ? Math.round((completed / total) * 100) : null,
    nextItemTitle: nextItem?.title || '',
    nextItemDate: nextItem?.dateEnd || nextItem?.dateStart || '',
  }
}

export function createApiV1ClientProjectWorkItemsDto(
  project: ProjectWorkItemsRow,
  rows: WorkItemRow[],
  photoCountByItemId: Record<number, number>,
): ApiV1ClientProjectWorkItems {
  const items = rows.map(row => createWorkItem(row, photoCountByItemId))

  return {
    project: createProjectRef(project),
    summary: createSummary(items),
    items,
  }
}
