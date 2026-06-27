import { CONTRACTOR_ROLE_TYPE_OPTIONS } from '~/shared/types/catalogs'
import type {
  ApiV1TaskProjectRef,
  ApiV1TaskStatusPolicy,
  ApiV1TaskSubject,
  ApiV1TaskSubjectKind,
  ApiV1TaskSubjectRef,
  ApiV1TaskSubjectTaskSummary,
  ApiV1TaskSubjects,
  ApiV1TaskWorkerStatus,
  ApiV1TaskWorkItem,
  ApiV1TaskWorkItems,
  ApiV1TaskWorkItemsSummary,
} from '~/shared/types/api-v1'
import {
  normalizeWorkStatus,
  workTypeLabel,
  type CanonicalWorkStatus,
} from '~/shared/utils/work-status'

export type ApiV1TaskContractorRow = {
  id: number
  name: string
  companyName: string | null
  contactPerson: string | null
  phone: string | null
  email: string | null
  messenger: string | null
  messengerNick: string | null
  workTypes: string[]
  roleTypes: string[]
  contractorType: string
  parentId: number | null
  createdAt?: Date | string | null
}

export type ApiV1TaskProjectRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  updatedAt: Date | string | null
}

export type ApiV1TaskProjectContractorRow = {
  id: number
  contractorId: number
  project: ApiV1TaskProjectRow
}

export type ApiV1TaskLegacyWorkItemRow = {
  id: number
  project: ApiV1TaskProjectRow
  contractorId: number | null
  title: string
  workType: string | null
  status: string
  dateStart: string | null
  dateEnd: string | null
  sortOrder: number
  photoCount?: number
  commentCount?: number
}

const ROLE_LABELS = Object.fromEntries(
  CONTRACTOR_ROLE_TYPE_OPTIONS.map(option => [option.value, option.label]),
) as Record<string, string>

const WORKER_STATUS_LABELS: Record<ApiV1TaskWorkerStatus, string> = {
  assigned: 'назначено',
  accepted: 'принято',
  in_progress: 'в работе',
  ready_for_review: 'на проверке',
  blocked: 'заблокировано',
  needs_fix: 'нужны правки',
  done: 'закрыто',
  cancelled: 'отменено',
}

export const API_V1_TASK_WORKER_STATUSES = [
  'assigned',
  'accepted',
  'in_progress',
  'ready_for_review',
  'blocked',
  'needs_fix',
  'done',
  'cancelled',
] as const satisfies readonly ApiV1TaskWorkerStatus[]

const LEGACY_TO_WORKER_STATUS: Partial<Record<CanonicalWorkStatus, ApiV1TaskWorkerStatus>> = {
  pending: 'assigned',
  planned: 'assigned',
  assigned: 'assigned',
  accepted: 'accepted',
  in_progress: 'in_progress',
  ready_for_review: 'ready_for_review',
  paused: 'blocked',
  blocked: 'blocked',
  needs_fix: 'needs_fix',
  done: 'done',
  skipped: 'cancelled',
  cancelled: 'cancelled',
}

export const API_V1_TASK_WORKER_STATUS_TRANSITIONS: Record<ApiV1TaskWorkerStatus, ApiV1TaskWorkerStatus[]> = {
  assigned: ['accepted', 'in_progress'],
  accepted: ['in_progress'],
  in_progress: ['blocked', 'ready_for_review'],
  ready_for_review: [],
  blocked: ['in_progress'],
  needs_fix: ['in_progress'],
  done: [],
  cancelled: [],
}

export const API_V1_TASK_REVIEWER_STATUS_TRANSITIONS: Partial<Record<ApiV1TaskWorkerStatus, ApiV1TaskWorkerStatus[]>> = {
  ready_for_review: ['done', 'needs_fix'],
}

const FUTURE_WORKER_STATUSES = new Set<ApiV1TaskWorkerStatus>(API_V1_TASK_WORKER_STATUSES)

function safeString(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeStringList(values: unknown, maxLength = 240): string[] {
  if (!Array.isArray(values)) return []
  return values
    .map(value => safeString(value, maxLength))
    .filter(Boolean)
}

function asInt(value: unknown): number {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function toIso(value: Date | string | null | undefined): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return ''
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function createProjectRef(project: ApiV1TaskProjectRow): ApiV1TaskProjectRef {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    updatedAt: toIso(project.updatedAt),
    addressableId: `project:${project.slug}`,
  }
}

function isCompany(row: ApiV1TaskContractorRow | null | undefined): boolean {
  return row?.contractorType === 'company'
}

function subjectIdForContractor(row: ApiV1TaskContractorRow): string {
  return isCompany(row)
    ? `subject:contractor:${row.id}`
    : `subject:worker:${row.id}`
}

function crewSubjectId(projectId: number, contractorId: number): string {
  return `subject:crew:project:${projectId}:contractor:${contractorId}`
}

function displayNameForContractor(row: ApiV1TaskContractorRow): string {
  return safeString(row.companyName, 240) || safeString(row.name, 240) || `Подрядчик #${row.id}`
}

function secondaryNameForContractor(row: ApiV1TaskContractorRow): string {
  const name = safeString(row.name, 240)
  const companyName = safeString(row.companyName, 240)
  if (isCompany(row)) return safeString(row.contactPerson, 240) || name
  return companyName && companyName !== name ? companyName : ''
}

function roleLabels(roleTypes: string[]): string[] {
  return unique(roleTypes.map(role => ROLE_LABELS[role] || role))
}

function workTypeLabels(workTypes: string[]): string[] {
  return unique(workTypes.map(workTypeLabel))
}

export function normalizeApiV1TaskWorkerStatus(status: string | null | undefined): ApiV1TaskWorkerStatus {
  const normalizedRaw = safeString(status, 80).toLowerCase().replace(/[\s-]+/g, '_') as ApiV1TaskWorkerStatus
  if (FUTURE_WORKER_STATUSES.has(normalizedRaw)) return normalizedRaw
  return LEGACY_TO_WORKER_STATUS[normalizeWorkStatus(status)] || 'assigned'
}

export function apiV1TaskWorkerStatusLabel(status: ApiV1TaskWorkerStatus): string {
  return WORKER_STATUS_LABELS[status] || status
}

export type ApiV1TaskStatusTransitionActor = 'admin' | 'contractor' | 'foreman' | 'worker'

export function getApiV1TaskAllowedTransitions(
  status: ApiV1TaskWorkerStatus,
  actorRole: ApiV1TaskStatusTransitionActor = 'worker',
): ApiV1TaskWorkerStatus[] {
  const workerTransitions = API_V1_TASK_WORKER_STATUS_TRANSITIONS[status] || []
  if (actorRole === 'worker' || actorRole === 'contractor' || actorRole === 'foreman') {
    return workerTransitions
  }

  const reviewerTransitions = API_V1_TASK_REVIEWER_STATUS_TRANSITIONS[status] || []
  const cancelTransition = status !== 'done' && status !== 'cancelled' ? ['cancelled' as const] : []
  return unique([...workerTransitions, ...reviewerTransitions, ...cancelTransition])
}

export function createApiV1TaskStatusPolicy(status: ApiV1TaskWorkerStatus): ApiV1TaskStatusPolicy {
  return {
    canWorkerSelfConfirm: false,
    reviewRequired: status === 'ready_for_review',
    allowedTransitions: API_V1_TASK_WORKER_STATUS_TRANSITIONS[status],
  }
}

function isOverdue(status: ApiV1TaskWorkerStatus, dateEnd: string): boolean {
  if (!dateEnd) return false
  if (status === 'done' || status === 'cancelled') return false
  return dateEnd < new Date().toISOString().slice(0, 10)
}

function emptyTaskSummary(): ApiV1TaskSubjectTaskSummary {
  return {
    total: 0,
    assigned: 0,
    accepted: 0,
    inProgress: 0,
    readyForReview: 0,
    blocked: 0,
    needsFix: 0,
    done: 0,
    cancelled: 0,
    open: 0,
    overdue: 0,
  }
}

function incrementSummary(summary: ApiV1TaskSubjectTaskSummary, item: ApiV1TaskLegacyWorkItemRow) {
  const status = normalizeApiV1TaskWorkerStatus(item.status)
  const dateEnd = safeString(item.dateEnd, 40)

  summary.total += 1
  if (status === 'assigned') summary.assigned += 1
  if (status === 'accepted') summary.accepted += 1
  if (status === 'in_progress') summary.inProgress += 1
  if (status === 'ready_for_review') summary.readyForReview += 1
  if (status === 'blocked') summary.blocked += 1
  if (status === 'needs_fix') summary.needsFix += 1
  if (status === 'done') summary.done += 1
  if (status === 'cancelled') summary.cancelled += 1
  if (status !== 'done' && status !== 'cancelled') summary.open += 1
  if (isOverdue(status, dateEnd)) summary.overdue += 1
}

function createWorkItemsSummary(items: ApiV1TaskWorkItem[]): ApiV1TaskWorkItemsSummary {
  return items.reduce<ApiV1TaskWorkItemsSummary>((summary, item) => {
    summary.total += 1
    if (item.workerStatus === 'assigned') summary.assigned += 1
    if (item.workerStatus === 'accepted') summary.accepted += 1
    if (item.workerStatus === 'in_progress') summary.inProgress += 1
    if (item.workerStatus === 'ready_for_review') summary.readyForReview += 1
    if (item.workerStatus === 'blocked') summary.blocked += 1
    if (item.workerStatus === 'needs_fix') summary.needsFix += 1
    if (item.workerStatus === 'done') summary.done += 1
    if (item.workerStatus === 'cancelled') summary.cancelled += 1
    if (item.workerStatus !== 'done' && item.workerStatus !== 'cancelled') summary.open += 1
    if (item.overdue) summary.overdue += 1
    return summary
  }, {
    total: 0,
    assigned: 0,
    accepted: 0,
    inProgress: 0,
    readyForReview: 0,
    blocked: 0,
    needsFix: 0,
    done: 0,
    cancelled: 0,
    open: 0,
    overdue: 0,
  })
}

function createSubjectRef(row: ApiV1TaskContractorRow): ApiV1TaskSubjectRef {
  const id = subjectIdForContractor(row)
  return {
    id,
    addressableId: id,
    subjectKind: isCompany(row) ? 'contractor' : 'worker',
    displayName: displayNameForContractor(row),
  }
}

function createCrewSubjectRef(project: ApiV1TaskProjectRow, contractor: ApiV1TaskContractorRow): ApiV1TaskSubjectRef {
  const id = crewSubjectId(project.id, contractor.id)
  return {
    id,
    addressableId: id,
    subjectKind: 'crew',
    displayName: `Бригада ${displayNameForContractor(contractor)}`,
  }
}

function matchesQuery(subject: ApiV1TaskSubject, q: string): boolean {
  if (!q) return true
  const haystack = [
    subject.displayName,
    subject.secondaryName,
    subject.contractorType,
    subject.roleLabels.join(' '),
    subject.workTypeLabels.join(' '),
    subject.projectRefs.map(project => `${project.title} ${project.slug}`).join(' '),
  ].join(' ').toLowerCase()
  return haystack.includes(q)
}

function sortProjects(projects: ApiV1TaskProjectRef[]): ApiV1TaskProjectRef[] {
  const byId = new Map<number, ApiV1TaskProjectRef>()
  for (const project of projects) byId.set(project.id, project)
  return Array.from(byId.values()).sort((a, b) => a.title.localeCompare(b.title, 'ru'))
}

function sortSubjects(items: ApiV1TaskSubject[]): ApiV1TaskSubject[] {
  const kindWeight: Record<ApiV1TaskSubjectKind, number> = {
    contractor: 0,
    crew: 1,
    worker: 2,
  }
  return [...items].sort((a, b) => {
    if (a.subjectKind !== b.subjectKind) return kindWeight[a.subjectKind] - kindWeight[b.subjectKind]
    if (b.taskSummary.open !== a.taskSummary.open) return b.taskSummary.open - a.taskSummary.open
    return a.displayName.localeCompare(b.displayName, 'ru')
  })
}

export function createApiV1TasksSubjectsDto(input: {
  contractors: ApiV1TaskContractorRow[]
  projectContractors: ApiV1TaskProjectContractorRow[]
  workItems: ApiV1TaskLegacyWorkItemRow[]
  filters: {
    q?: string
    projectSlug?: string
    subjectKind?: string
    limit?: number
    offset?: number
  }
}): ApiV1TaskSubjects {
  const q = safeString(input.filters.q).toLowerCase()
  const projectSlug = safeString(input.filters.projectSlug, 160)
  const subjectKind = safeString(input.filters.subjectKind, 80) as ApiV1TaskSubjectKind | ''
  const limit = Math.max(1, Math.min(200, asInt(input.filters.limit) || 100))
  const offset = Math.max(0, asInt(input.filters.offset))

  const contractorsById = new Map(input.contractors.map(row => [row.id, row]))
  const childrenByParentId = new Map<number, ApiV1TaskContractorRow[]>()
  const projectRefsByContractorId = new Map<number, ApiV1TaskProjectRef[]>()
  const crewLinkByKey = new Map<string, ApiV1TaskProjectContractorRow>()

  for (const row of input.contractors) {
    if (!row.parentId) continue
    const current = childrenByParentId.get(row.parentId) || []
    current.push(row)
    childrenByParentId.set(row.parentId, current)
  }

  for (const link of input.projectContractors) {
    const current = projectRefsByContractorId.get(link.contractorId) || []
    current.push(createProjectRef(link.project))
    projectRefsByContractorId.set(link.contractorId, current)
    crewLinkByKey.set(`${link.project.id}:${link.contractorId}`, link)
  }

  const tasksByContractorId = new Map<number, ApiV1TaskLegacyWorkItemRow[]>()
  for (const item of input.workItems) {
    if (!item.contractorId) continue
    const current = tasksByContractorId.get(item.contractorId) || []
    current.push(item)
    tasksByContractorId.set(item.contractorId, current)
  }

  const subjectRows: ApiV1TaskSubject[] = []
  const tasksBySubjectId = new Map<string, ApiV1TaskLegacyWorkItemRow[]>()

  for (const contractor of input.contractors) {
    const isContractorCompany = isCompany(contractor)
    const kind: ApiV1TaskSubjectKind = isContractorCompany ? 'contractor' : 'worker'
    const id = subjectIdForContractor(contractor)
    const roles = safeStringList(contractor.roleTypes, 120)
    const workTypes = safeStringList(contractor.workTypes, 120)
    const directProjects = projectRefsByContractorId.get(contractor.id) || []
    const inheritedProjects = !isContractorCompany && contractor.parentId
      ? projectRefsByContractorId.get(contractor.parentId) || []
      : []
    const projects = sortProjects(unique([...directProjects, ...inheritedProjects]))
    const taskSummary = emptyTaskSummary()
    const directTasks = tasksByContractorId.get(contractor.id) || []
    const subjectTasks = [...directTasks]

    for (const task of directTasks) incrementSummary(taskSummary, task)

    if (isContractorCompany) {
      for (const child of childrenByParentId.get(contractor.id) || []) {
        for (const task of tasksByContractorId.get(child.id) || []) {
          subjectTasks.push(task)
          incrementSummary(taskSummary, task)
        }
      }
    }

    tasksBySubjectId.set(id, subjectTasks)

    subjectRows.push({
      id,
      addressableId: id,
      subjectKind: kind,
      displayName: displayNameForContractor(contractor),
      secondaryName: secondaryNameForContractor(contractor),
      legalType: isContractorCompany ? 'company' : 'master',
      contractorType: contractor.contractorType,
      contact: {
        phone: safeString(contractor.phone, 80),
        email: safeString(contractor.email, 160),
        messenger: safeString(contractor.messenger, 80),
        messengerNick: safeString(contractor.messengerNick, 160),
      },
      roleKeys: roles,
      roleLabels: roleLabels(roles),
      workTypeKeys: workTypes,
      workTypeLabels: workTypeLabels(workTypes),
      isForeman: roles.includes('foreman') || roles.includes('site_manager'),
      parentSubjectId: contractor.parentId && contractorsById.has(contractor.parentId)
        ? subjectIdForContractor(contractorsById.get(contractor.parentId)!)
        : '',
      source: {
        type: 'legacy_contractor',
        table: 'contractors',
        id: contractor.id,
        legacyContractorId: contractor.id,
        projectId: null,
        migrationStable: false,
      },
      projectRefs: projects,
      taskSummary,
    })
  }

  const crewKeys = new Map<string, {
    contractor: ApiV1TaskContractorRow
    project: ApiV1TaskProjectRow
    linkId: number
    tasks: ApiV1TaskLegacyWorkItemRow[]
  }>()

  for (const link of input.projectContractors) {
    const contractor = contractorsById.get(link.contractorId)
    if (!contractor || !isCompany(contractor)) continue
    crewKeys.set(`${link.project.id}:${contractor.id}`, {
      contractor,
      project: link.project,
      linkId: link.id,
      tasks: [],
    })
  }

  for (const item of input.workItems) {
    if (!item.contractorId) continue
    const contractor = contractorsById.get(item.contractorId)
    const parentCompany = contractor?.parentId ? contractorsById.get(contractor.parentId) : null
    const crewContractor = isCompany(contractor) ? contractor : isCompany(parentCompany) ? parentCompany : null
    if (!crewContractor) continue
    const key = `${item.project.id}:${crewContractor.id}`
    const existing = crewKeys.get(key) || {
      contractor: crewContractor,
      project: item.project,
      linkId: crewLinkByKey.get(key)?.id || item.id,
      tasks: [],
    }
    existing.tasks.push(item)
    crewKeys.set(key, existing)
  }

  for (const crew of crewKeys.values()) {
    const id = crewSubjectId(crew.project.id, crew.contractor.id)
    const roles = safeStringList(crew.contractor.roleTypes, 120)
    const workTypes = safeStringList(crew.contractor.workTypes, 120)
    const taskSummary = emptyTaskSummary()
    for (const task of crew.tasks) incrementSummary(taskSummary, task)
    tasksBySubjectId.set(id, crew.tasks)

    subjectRows.push({
      id,
      addressableId: id,
      subjectKind: 'crew',
      displayName: `Бригада ${displayNameForContractor(crew.contractor)}`,
      secondaryName: crew.project.title,
      legalType: 'derived',
      contractorType: 'derived_crew',
      contact: {
        phone: safeString(crew.contractor.phone, 80),
        email: safeString(crew.contractor.email, 160),
        messenger: safeString(crew.contractor.messenger, 80),
        messengerNick: safeString(crew.contractor.messengerNick, 160),
      },
      roleKeys: roles,
      roleLabels: unique([...roleLabels(roles), 'Проектная бригада']),
      workTypeKeys: workTypes,
      workTypeLabels: workTypeLabels(workTypes),
      isForeman: roles.includes('foreman') || roles.includes('site_manager'),
      parentSubjectId: subjectIdForContractor(crew.contractor),
      source: {
        type: 'derived_project_crew',
        table: crewLinkByKey.has(`${crew.project.id}:${crew.contractor.id}`) ? 'project_contractors' : 'work_status_items',
        id: crew.linkId,
        legacyContractorId: crew.contractor.id,
        projectId: crew.project.id,
        migrationStable: false,
      },
      projectRefs: [createProjectRef(crew.project)],
      taskSummary,
    })
  }

  const normalizedSubjectKind = (['contractor', 'crew', 'worker'] as string[]).includes(subjectKind)
    ? subjectKind
    : ''
  const filtered = sortSubjects(subjectRows)
    .filter(subject => !normalizedSubjectKind || subject.subjectKind === normalizedSubjectKind)
    .filter(subject => !projectSlug || subject.projectRefs.some(project => project.slug === projectSlug))
    .filter(subject => matchesQuery(subject, q))
  const pagedItems = filtered.slice(offset, offset + limit)
  const visibleOpenTaskIds = new Set<number>()
  const visibleOverdueTaskIds = new Set<number>()

  for (const subject of filtered) {
    for (const task of tasksBySubjectId.get(subject.id) || []) {
      const status = normalizeApiV1TaskWorkerStatus(task.status)
      const dateEnd = safeString(task.dateEnd, 40)
      if (status !== 'done' && status !== 'cancelled') visibleOpenTaskIds.add(task.id)
      if (isOverdue(status, dateEnd)) visibleOverdueTaskIds.add(task.id)
    }
  }

  return {
    summary: {
      total: filtered.length,
      contractors: filtered.filter(subject => subject.subjectKind === 'contractor').length,
      crews: filtered.filter(subject => subject.subjectKind === 'crew').length,
      workers: filtered.filter(subject => subject.subjectKind === 'worker').length,
      foremen: filtered.filter(subject => subject.isForeman).length,
      openWorkItems: visibleOpenTaskIds.size,
      overdueWorkItems: visibleOverdueTaskIds.size,
    },
    items: pagedItems,
    filters: {
      q,
      projectSlug,
      subjectKind: normalizedSubjectKind as ApiV1TaskSubjectKind | '',
      limit,
      offset,
      total: filtered.length,
    },
  }
}

function createWorkItemAssignee(
  item: ApiV1TaskLegacyWorkItemRow,
  contractor: ApiV1TaskContractorRow | undefined,
  contractorsById: Map<number, ApiV1TaskContractorRow>,
): { assignee: ApiV1TaskSubjectRef | null; legalSubject: ApiV1TaskSubjectRef | null } {
  if (!contractor) return { assignee: null, legalSubject: null }
  if (isCompany(contractor)) {
    return {
      assignee: createCrewSubjectRef(item.project, contractor),
      legalSubject: createSubjectRef(contractor),
    }
  }

  const parent = contractor.parentId ? contractorsById.get(contractor.parentId) : null

  return {
    assignee: createSubjectRef(contractor),
    legalSubject: parent && isCompany(parent) ? createSubjectRef(parent) : createSubjectRef(contractor),
  }
}

function createTaskWorkItem(
  item: ApiV1TaskLegacyWorkItemRow,
  contractorsById: Map<number, ApiV1TaskContractorRow>,
): ApiV1TaskWorkItem {
  const contractor = item.contractorId ? contractorsById.get(item.contractorId) : undefined
  const { assignee, legalSubject } = createWorkItemAssignee(item, contractor, contractorsById)
  const workerStatus = normalizeApiV1TaskWorkerStatus(item.status)
  const dateEnd = safeString(item.dateEnd, 40)
  const id = `task:work_status_item:${item.id}`

  return {
    id,
    addressableId: id,
    source: {
      type: 'legacy_work_status_item',
      table: 'work_status_items',
      id: item.id,
    },
    title: safeString(item.title, 240) || 'Задача',
    project: createProjectRef(item.project),
    workType: safeString(item.workType, 120),
    workTypeLabel: item.workType ? workTypeLabel(item.workType) : '',
    legacyStatus: safeString(item.status, 80),
    workerStatus,
    workerStatusLabel: apiV1TaskWorkerStatusLabel(workerStatus),
    statusPolicy: createApiV1TaskStatusPolicy(workerStatus),
    assignee,
    legalSubject,
    dateStart: safeString(item.dateStart, 40),
    dateEnd,
    overdue: isOverdue(workerStatus, dateEnd),
    sortOrder: asInt(item.sortOrder),
    photoCount: Math.max(0, asInt(item.photoCount)),
    commentCount: Math.max(0, asInt(item.commentCount)),
  }
}

function matchesWorkItemQuery(item: ApiV1TaskWorkItem, q: string): boolean {
  if (!q) return true
  const haystack = [
    item.title,
    item.project.title,
    item.project.slug,
    item.workType,
    item.workTypeLabel,
    item.legacyStatus,
    item.workerStatus,
    item.assignee?.displayName || '',
    item.legalSubject?.displayName || '',
  ].join(' ').toLowerCase()
  return haystack.includes(q)
}

function sortWorkItems(items: ApiV1TaskWorkItem[]): ApiV1TaskWorkItem[] {
  return [...items].sort((a, b) => {
    if (a.project.slug !== b.project.slug) return a.project.slug.localeCompare(b.project.slug)
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    return a.title.localeCompare(b.title, 'ru')
  })
}

export function createApiV1TasksWorkItemsDto(input: {
  contractors: ApiV1TaskContractorRow[]
  workItems: ApiV1TaskLegacyWorkItemRow[]
  filters: {
    q?: string
    projectSlug?: string
    assigneeId?: string
    status?: string
    limit?: number
    offset?: number
  }
}): ApiV1TaskWorkItems {
  const q = safeString(input.filters.q).toLowerCase()
  const projectSlug = safeString(input.filters.projectSlug, 160)
  const assigneeId = safeString(input.filters.assigneeId, 240)
  const requestedStatus = safeString(input.filters.status, 80) as ApiV1TaskWorkerStatus | ''
  const status = FUTURE_WORKER_STATUSES.has(requestedStatus as ApiV1TaskWorkerStatus)
    ? requestedStatus as ApiV1TaskWorkerStatus
    : ''
  const limit = Math.max(1, Math.min(200, asInt(input.filters.limit) || 100))
  const offset = Math.max(0, asInt(input.filters.offset))
  const contractorsById = new Map(input.contractors.map(row => [row.id, row]))
  const allItems = sortWorkItems(
    input.workItems.map(item => createTaskWorkItem(item, contractorsById)),
  )
    .filter(item => !projectSlug || item.project.slug === projectSlug)
    .filter(item => !assigneeId || item.assignee?.id === assigneeId || item.legalSubject?.id === assigneeId)
    .filter(item => !status || item.workerStatus === status)
    .filter(item => matchesWorkItemQuery(item, q))
  const pagedItems = allItems.slice(offset, offset + limit)

  return {
    summary: createWorkItemsSummary(allItems),
    items: pagedItems,
    filters: {
      q,
      projectSlug,
      assigneeId,
      status,
      limit,
      offset,
      total: allItems.length,
    },
  }
}
