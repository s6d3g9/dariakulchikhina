import type {
  ApiV1ProjectActivity,
  ApiV1ProjectActivityActorRole,
  ApiV1ProjectActivityAudience,
  ApiV1ProjectActivityItem,
  ApiV1ProjectActivityTone,
  ApiV1ProjectRef,
} from '~/shared/types/api-v1'
import { ensureHybridControl } from '~/shared/utils/project/project-control'
import { workStatusLabel } from '~/shared/utils/work-status'

export type ApiV1ProjectActivityProjectRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  profile: Record<string, unknown> | null
  updatedAt: Date | string | null
}

export type ApiV1ProjectActivityDocumentRow = {
  id: number
  category: string
  title: string
  filename: string | null
  url: string | null
  createdAt: Date | string | null
}

export type ApiV1ProjectActivityExtraServiceRow = {
  id: number
  requestedBy: string
  title: string
  description: string | null
  status: string
  clientNotes: string | null
  createdAt: Date | string | null
  updatedAt: Date | string | null
}

export type ApiV1ProjectActivityWorkCommentRow = {
  id: number
  itemId: number
  authorType: string
  authorName: string
  text: string
  createdAt: Date | string | null
  taskTitle: string
  taskStatus: string
  contractorName: string | null
  contractorCompanyName: string | null
}

function safeString(value: unknown, maxLength = 800) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function toIso(value: Date | string | null | undefined) {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return ''
}

function createProjectRef(project: ApiV1ProjectActivityProjectRow): ApiV1ProjectRef {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    updatedAt: toIso(project.updatedAt),
  }
}

function actor(role: ApiV1ProjectActivityActorRole, displayName: string) {
  return {
    role,
    displayName: displayName || 'Система',
  }
}

function serviceTone(status: string): ApiV1ProjectActivityTone {
  if (status === 'approved' || status === 'paid' || status === 'done') return 'success'
  if (status === 'cancelled' || status === 'rejected') return 'warning'
  return 'neutral'
}

function callTone(tone: string): ApiV1ProjectActivityTone {
  if (tone === 'critical') return 'critical'
  if (tone === 'warning') return 'warning'
  if (tone === 'stable') return 'success'
  return 'neutral'
}

function isStatusAuditComment(text: string) {
  return /^Статус задачи:/i.test(text.trim())
}

function createDocumentItem(row: ApiV1ProjectActivityDocumentRow, audience: ApiV1ProjectActivityAudience): ApiV1ProjectActivityItem {
  const title = safeString(row.title, 240) || 'Документ'
  const filename = safeString(row.filename, 240)
  return {
    id: `activity:document:${row.id}`,
    kind: 'document_created',
    tone: 'neutral',
    audience,
    clientSafe: true,
    occurredAt: toIso(row.createdAt),
    title: 'Документ добавлен',
    summary: title,
    body: audience === 'admin' && filename ? filename : '',
    actor: actor('studio', 'Студия'),
    source: {
      table: 'documents',
      id: String(row.id),
    },
    related: {
      documentId: row.id,
    },
  }
}

function createServiceItems(row: ApiV1ProjectActivityExtraServiceRow, audience: ApiV1ProjectActivityAudience): ApiV1ProjectActivityItem[] {
  const title = safeString(row.title, 240) || 'Доп. услуга'
  const requestedByClient = row.requestedBy === 'client'
  const base = {
    kind: 'extra_service_requested' as const,
    tone: serviceTone(row.status),
    audience,
    clientSafe: true,
    title: requestedByClient ? 'Клиент запросил доп. услугу' : 'Студия добавила доп. услугу',
    summary: title,
    body: audience === 'admin'
      ? safeString(row.clientNotes || row.description, 800)
      : safeString(row.description, 360),
    actor: actor(requestedByClient ? 'client' : 'studio', requestedByClient ? 'Клиент' : 'Студия'),
    source: {
      table: 'project_extra_services' as const,
      id: String(row.id),
    },
    related: {
      serviceId: row.id,
    },
  }

  const items: ApiV1ProjectActivityItem[] = [{
    ...base,
    id: `activity:extra-service:${row.id}:created`,
    occurredAt: toIso(row.createdAt),
  }]

  const createdAt = toIso(row.createdAt)
  const updatedAt = toIso(row.updatedAt)
  if (updatedAt && updatedAt !== createdAt) {
    items.push({
      ...base,
      id: `activity:extra-service:${row.id}:updated`,
      kind: 'extra_service_updated',
      title: 'Статус доп. услуги обновлён',
      summary: `${title}: ${row.status}`,
      body: audience === 'admin' ? safeString(row.clientNotes, 800) : '',
      actor: actor('studio', 'Студия'),
      occurredAt: updatedAt,
    })
  }

  return items
}

function createWorkCommentItem(row: ApiV1ProjectActivityWorkCommentRow, audience: ApiV1ProjectActivityAudience): ApiV1ProjectActivityItem | null {
  const text = safeString(row.text, 1600)
  const statusAudit = isStatusAuditComment(text)
  const taskTitle = safeString(row.taskTitle, 240) || 'Задача'
  const displayName = safeString(row.authorName, 240) || safeString(row.contractorCompanyName || row.contractorName, 240)
  const role: ApiV1ProjectActivityActorRole = row.authorType === 'admin' ? 'admin' : 'contractor'

  if (audience === 'client' && !statusAudit) {
    return null
  }

  return {
    id: `activity:work-comment:${row.id}`,
    kind: statusAudit ? 'work_item_status' : 'work_item_comment',
    tone: row.taskStatus === 'done' ? 'success' : row.taskStatus === 'paused' || row.taskStatus === 'blocked' ? 'warning' : 'neutral',
    audience,
    clientSafe: statusAudit,
    occurredAt: toIso(row.createdAt),
    title: statusAudit ? 'Статус задачи обновлён' : 'Комментарий по задаче',
    summary: statusAudit
      ? `${taskTitle}: ${workStatusLabel(row.taskStatus)}`
      : taskTitle,
    body: audience === 'admin' ? text : '',
    actor: actor(role, displayName || (role === 'admin' ? 'Студия' : 'Исполнитель')),
    source: {
      table: 'work_status_item_comments',
      id: String(row.id),
    },
    related: {
      taskId: row.itemId,
      taskTitle,
      taskStatus: row.taskStatus,
    },
  }
}

function createCallInsightItems(project: ApiV1ProjectActivityProjectRow, audience: ApiV1ProjectActivityAudience): ApiV1ProjectActivityItem[] {
  const control = ensureHybridControl(project.profile?.hybridControl, project)
  const visibleInsights = audience === 'client'
    ? control.callInsights.filter(insight => insight.clientVisible === true)
    : control.callInsights

  return visibleInsights.map((insight) => ({
    id: `activity:call-insight:${insight.id}`,
    kind: 'call_insight',
    tone: callTone(insight.tone),
    audience,
    clientSafe: true,
    occurredAt: insight.happenedAt || insight.createdAt,
    title: insight.title || 'Итог коммуникации',
    summary: insight.summary || insight.title || 'Зафиксированы решения по проекту',
    body: audience === 'admin'
      ? [
          ...(insight.decisions || []),
          ...(insight.nextSteps || []),
          ...(insight.blockers || []),
          ...(insight.approvals || []),
        ].slice(0, 6).join('\n')
      : (insight.approvals || insight.decisions || []).slice(0, 3).join('\n'),
    actor: actor('studio', 'Студия'),
    source: {
      table: 'project_profile',
      id: `hybridControl.callInsights.${insight.id}`,
    },
    related: {
      callInsightId: insight.id,
    },
  }))
}

function sortActivityItems(items: ApiV1ProjectActivityItem[]) {
  return [...items].sort((a, b) => {
    const left = a.occurredAt || ''
    const right = b.occurredAt || ''
    if (left !== right) return right.localeCompare(left)
    return b.id.localeCompare(a.id)
  })
}

function createSummary(items: ApiV1ProjectActivityItem[]) {
  return {
    total: items.length,
    documents: items.filter(item => item.kind === 'document_created').length,
    extraServices: items.filter(item => item.kind === 'extra_service_requested' || item.kind === 'extra_service_updated').length,
    workItems: items.filter(item => item.kind === 'work_item_comment' || item.kind === 'work_item_status').length,
    callInsights: items.filter(item => item.kind === 'call_insight').length,
    warnings: items.filter(item => item.tone === 'warning' || item.tone === 'critical').length,
  }
}

export function createApiV1ProjectActivityDto(input: {
  project: ApiV1ProjectActivityProjectRow
  documents: ApiV1ProjectActivityDocumentRow[]
  extraServices: ApiV1ProjectActivityExtraServiceRow[]
  workComments: ApiV1ProjectActivityWorkCommentRow[]
  audience: ApiV1ProjectActivityAudience
  filters?: {
    limit?: number
    offset?: number
  }
}): ApiV1ProjectActivity {
  const limit = Math.max(1, Math.min(100, Number(input.filters?.limit || 50)))
  const offset = Math.max(0, Number(input.filters?.offset || 0))
  const rawItems = [
    ...input.documents.map(row => createDocumentItem(row, input.audience)),
    ...input.extraServices.flatMap(row => createServiceItems(row, input.audience)),
    ...input.workComments.map(row => createWorkCommentItem(row, input.audience)).filter((item): item is ApiV1ProjectActivityItem => Boolean(item)),
    ...createCallInsightItems(input.project, input.audience),
  ]
  const visibleItems = input.audience === 'client'
    ? rawItems.filter(item => item.clientSafe)
    : rawItems
  const sortedItems = sortActivityItems(visibleItems)

  return {
    project: createProjectRef(input.project),
    audience: input.audience,
    summary: createSummary(sortedItems),
    items: sortedItems.slice(offset, offset + limit),
    filters: {
      limit,
      offset,
      total: sortedItems.length,
    },
  }
}
