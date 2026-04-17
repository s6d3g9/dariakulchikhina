import * as repo from '~/server/modules/projects/project-comms-action-helpers.repository'
import { generateExtraServiceDocuments } from '~/server/modules/projects/project-extra-service-documents.service'
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, type ProjectStatus } from '~/shared/types/catalogs'
import type {
  HybridControl,
  HybridControlSprint,
  HybridControlTask,
  HybridControlTaskStatus,
} from '~/shared/types/project'
import { buildHybridControlSummary, ensureHybridControl } from '~/shared/utils/project-control'
import { normalizeWorkStatus, workStatusLabel, type CanonicalWorkStatus } from '~/shared/utils/work-status'

export type MessengerProjectMutationActionId =
  | 'assign_task'
  | 'accept_stage'
  | 'change_phase'
  | 'create_invoice'
  | 'create_task'
  | 'order_extra_service'
  | 'update_work_status'

export interface MessengerProjectMutationPayload {
  text?: string
  note?: string
  projectSlug?: string
  projectTitle?: string
  taskMode?: 'existing' | 'new'
  taskId?: string
  taskTitle?: string
  taskStatus?: string
  taskStatusLabel?: string
  phaseKey?: string
  phaseTitle?: string
  sprintId?: string
  sprintName?: string
  subjectId?: string
  subjectLabel?: string
  objectId?: string
  objectLabel?: string
  rangeStart?: string
  rangeEnd?: string
  documentId?: string
  documentTitle?: string
  serviceId?: string
  serviceTitle?: string
}

export interface ProjectCommunicationActionResult {
  message: string
  mutation: {
    kind: 'document' | 'extra-service' | 'hybrid-task' | 'project-status' | 'work-status'
    id: string
    label: string
  }
}

export type ProjectRow = {
  id: number
  slug: string
  title: string
  status: string
  pages: string[]
  profile: Record<string, unknown>
}

export const HYBRID_TASK_STATUS_LABELS: Record<HybridControlTaskStatus, string> = {
  todo: 'к выполнению',
  doing: 'в работе',
  review: 'на проверке',
  done: 'выполнено',
}

export function normalizePayloadText(value?: string) {
  return value?.trim() || ''
}

export function parsePrefixedNumber(value: string | undefined, prefix: string) {
  if (!value?.startsWith(prefix)) {
    return null
  }

  const parsed = Number(value.slice(prefix.length))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function parsePrefixedText(value: string | undefined, prefix: string) {
  if (!value?.startsWith(prefix)) {
    return ''
  }

  return value.slice(prefix.length).trim()
}

export function resolveProjectStatus(status: string): ProjectStatus {
  return PROJECT_STATUSES.includes(status as ProjectStatus)
    ? status as ProjectStatus
    : 'lead'
}

export function resolveNextProjectStatus(status: ProjectStatus) {
  const currentIndex = PROJECT_STATUSES.indexOf(status)
  if (currentIndex < 0 || currentIndex >= PROJECT_STATUSES.length - 1) {
    return status
  }

  return PROJECT_STATUSES[currentIndex + 1]!
}

export function buildTaskNotes(
  payload: MessengerProjectMutationPayload,
  options: { includeSubjectLabel?: boolean } = {},
) {
  const lines: string[] = []
  const note = normalizePayloadText(payload.note || payload.text)

  if (note) {
    lines.push(note)
  }

  if (options.includeSubjectLabel && normalizePayloadText(payload.subjectLabel)) {
    lines.push(`Субъект: ${normalizePayloadText(payload.subjectLabel)}`)
  }

  if (normalizePayloadText(payload.objectLabel)) {
    lines.push(`Контекст: ${normalizePayloadText(payload.objectLabel)}`)
  }

  if (normalizePayloadText(payload.documentTitle)) {
    lines.push(`Документ: ${normalizePayloadText(payload.documentTitle)}`)
  }

  if (normalizePayloadText(payload.serviceTitle)) {
    lines.push(`Услуга: ${normalizePayloadText(payload.serviceTitle)}`)
  }

  return lines.join('\n')
}

export async function loadProject(slug: string) {
  const row = await repo.findProjectBySlug(slug)

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  return {
    project: {
      ...row,
      pages: Array.isArray(row.pages) ? row.pages : [],
      profile: row.profile && typeof row.profile === 'object'
        ? row.profile as Record<string, unknown>
        : {},
    } satisfies ProjectRow,
  }
}

export async function assertContractorExists(contractorId: number) {
  const contractor = await repo.findContractorById(contractorId)

  if (!contractor) {
    throw createError({ statusCode: 404, statusMessage: 'Подрядчик не найден' })
  }
}

export async function createWorkStatusTask(project: ProjectRow, payload: MessengerProjectMutationPayload) {
  const contractorId = parsePrefixedNumber(payload.subjectId, 'contractor:')
  if (contractorId) {
    await assertContractorExists(contractorId)
  }

  const maxSort = await repo.findMaxWorkStatusSortOrder(project.id)

  const notes = buildTaskNotes(payload, {
    includeSubjectLabel: Boolean(payload.subjectLabel) && !contractorId,
  })

  return repo.insertWorkStatusItem({
    projectId: project.id,
    contractorId: contractorId || null,
    title: normalizePayloadText(payload.taskTitle) || 'Новая задача',
    status: 'pending',
    dateStart: normalizePayloadText(payload.rangeStart) || null,
    dateEnd: normalizePayloadText(payload.rangeEnd) || null,
    notes: notes || null,
    sortOrder: maxSort + 1,
  })
}

export async function updateWorkStatusTask(
  project: ProjectRow,
  payload: MessengerProjectMutationPayload,
  actionId: 'assign_task' | 'update_work_status',
) {
  const taskId = parsePrefixedNumber(payload.taskId, 'work:')
  if (!taskId) {
    throw createError({ statusCode: 400, statusMessage: 'Нужна задача из статуса работ' })
  }

  const contractorId = parsePrefixedNumber(payload.subjectId, 'contractor:')
  if (contractorId) {
    await assertContractorExists(contractorId)
  }

  const notes = buildTaskNotes(payload, {
    includeSubjectLabel: Boolean(payload.subjectLabel) && !contractorId,
  })

  const nextValues: Record<string, unknown> = {}
  if (actionId === 'update_work_status') {
    nextValues.status = resolveWorkStatusStatus(payload.taskStatus)
  }

  if (contractorId) {
    nextValues.contractorId = contractorId
  }

  if (normalizePayloadText(payload.taskTitle)) {
    nextValues.title = normalizePayloadText(payload.taskTitle)
  }

  if (normalizePayloadText(payload.rangeStart)) {
    nextValues.dateStart = normalizePayloadText(payload.rangeStart)
  }

  if (normalizePayloadText(payload.rangeEnd)) {
    nextValues.dateEnd = normalizePayloadText(payload.rangeEnd)
  }

  if (notes) {
    nextValues.notes = notes
  }

  const updated = await repo.updateWorkStatusItem(taskId, project.id, nextValues)

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Задача не найдена' })
  }

  return updated
}

export function resolveWorkStatusStatus(value?: string): CanonicalWorkStatus {
  const normalized = normalizePayloadText(value)
  if (!normalized) {
    throw createError({ statusCode: 400, statusMessage: 'Выберите новый статус задачи' })
  }

  return normalizeWorkStatus(normalized)
}

export function resolveHybridTaskStatus(value?: string): HybridControlTaskStatus {
  const normalized = normalizePayloadText(value).toLowerCase().replace(/[\s-]+/g, '_')
  switch (normalized) {
    case 'todo':
    case 'pending':
    case 'planned':
      return 'todo'
    case 'doing':
    case 'in_progress':
    case 'active':
      return 'doing'
    case 'review':
    case 'checking':
      return 'review'
    case 'done':
    case 'completed':
      return 'done'
    default:
      throw createError({ statusCode: 400, statusMessage: 'Выберите новый статус задачи' })
  }
}

export function findHybridTask(control: HybridControl, taskId: string) {
  for (const sprint of control.sprints) {
    const task = sprint.tasks.find(item => item.id === taskId)
    if (task) {
      return { sprint, task }
    }
  }

  return null
}

export function resolveHybridSprint(control: HybridControl, project: ProjectRow, payload: MessengerProjectMutationPayload) {
  if (normalizePayloadText(payload.sprintId)) {
    const existingSprint = control.sprints.find(sprint => sprint.id === payload.sprintId)
    if (existingSprint) {
      return existingSprint
    }
  }

  const hybridTaskId = parsePrefixedText(payload.taskId, 'hybrid:')
  if (hybridTaskId) {
    const located = findHybridTask(control, hybridTaskId)
    if (located) {
      return located.sprint
    }
  }

  if (normalizePayloadText(payload.phaseKey)) {
    const phaseSprint = control.sprints.find((sprint) => (
      sprint.linkedPhaseKey === payload.phaseKey
      && sprint.status !== 'done'
    ))
    if (phaseSprint) {
      return phaseSprint
    }
  }

  const summary = buildHybridControlSummary(control)
  if (summary.activeSprint) {
    const activeSprint = control.sprints.find(sprint => sprint.id === summary.activeSprint?.id)
    if (activeSprint) {
      return activeSprint
    }
  }

  const fallbackSprint = control.sprints.find(sprint => sprint.status === 'active' || sprint.status === 'planned')
  if (fallbackSprint) {
    return fallbackSprint
  }

  const fallbackPhaseKey = normalizePayloadText(payload.phaseKey)
    || summary.activePhase?.phaseKey
    || resolveProjectStatus(project.status)

  const createdSprint: HybridControlSprint = {
    id: `hybrid-sprint-chat-${Date.now()}`,
    name: normalizePayloadText(payload.sprintName) || `Спринт ${control.sprints.length + 1}`,
    linkedPhaseKey: fallbackPhaseKey,
    goal: normalizePayloadText(payload.objectLabel) || 'Сценарий, созданный из чата.',
    focus: normalizePayloadText(payload.note || payload.text),
    status: 'active',
    startDate: normalizePayloadText(payload.rangeStart),
    endDate: normalizePayloadText(payload.rangeEnd),
    retrospective: '',
    tasks: [],
  }

  control.sprints.push(createdSprint)
  return createdSprint
}

export function createHybridTask(control: HybridControl, project: ProjectRow, payload: MessengerProjectMutationPayload) {
  const sprint = resolveHybridSprint(control, project, payload)
  const task: HybridControlTask = {
    id: `hybrid-task-chat-${Date.now()}`,
    title: normalizePayloadText(payload.taskTitle) || 'Новая задача',
    status: 'todo',
    assignee: normalizePayloadText(payload.subjectLabel),
    dueDate: normalizePayloadText(payload.rangeEnd),
    points: 1,
    notes: buildTaskNotes(payload),
  }

  sprint.tasks.push(task)
  return task
}

export function updateHybridTask(control: HybridControl, payload: MessengerProjectMutationPayload, actionId: 'assign_task' | 'update_work_status') {
  const taskId = parsePrefixedText(payload.taskId, 'hybrid:')
  if (!taskId) {
    throw createError({ statusCode: 400, statusMessage: 'Нужна задача из контроля проекта' })
  }

  const located = findHybridTask(control, taskId)
  if (!located) {
    throw createError({ statusCode: 404, statusMessage: 'Задача не найдена' })
  }

  if (normalizePayloadText(payload.taskTitle)) {
    located.task.title = normalizePayloadText(payload.taskTitle)
  }

  if (normalizePayloadText(payload.subjectLabel)) {
    located.task.assignee = normalizePayloadText(payload.subjectLabel)
  }

  if (normalizePayloadText(payload.rangeEnd)) {
    located.task.dueDate = normalizePayloadText(payload.rangeEnd)
  }

  const notes = buildTaskNotes(payload)
  if (notes) {
    located.task.notes = notes
  }

  if (actionId === 'update_work_status') {
    located.task.status = resolveHybridTaskStatus(payload.taskStatus)
  }

  return located.task
}

export async function persistHybridControl(project: ProjectRow, control: HybridControl) {
  const nextControl = ensureHybridControl(control, project)

  await repo.updateProjectControl(project.slug, {
    ...project.profile,
    hybridControl: nextControl,
  })

  return nextControl
}

export async function setProjectStatus(project: ProjectRow, actionId: 'accept_stage' | 'change_phase', payload: MessengerProjectMutationPayload) {
  const currentStatus = resolveProjectStatus(project.status)
  const requestedStatus = normalizePayloadText(payload.phaseKey)
  const resolvedTarget = PROJECT_STATUSES.includes(requestedStatus as ProjectStatus)
    ? requestedStatus as ProjectStatus
    : currentStatus
  const targetStatus = actionId === 'accept_stage'
    ? resolveNextProjectStatus(resolvedTarget)
    : resolvedTarget

  await repo.updateProjectStatus(project.slug, targetStatus)

  return {
    slug: project.slug,
    status: targetStatus,
  }
}

export async function createExtraService(project: ProjectRow, payload: MessengerProjectMutationPayload) {
  const title = normalizePayloadText(payload.serviceTitle)
    || normalizePayloadText(payload.objectLabel)
    || normalizePayloadText(payload.note).slice(0, 120)
    || 'Дополнительная услуга'
  const description = buildTaskNotes(payload)

  return repo.insertExtraService(project.id, {
    requestedBy: 'admin',
    title,
    description: description || null,
    quantity: '1',
    unit: 'услуга',
    status: 'quoted',
    adminNotes: normalizePayloadText(payload.note) || null,
  })
}

export async function createExtraServiceInvoice(project: ProjectRow, payload: MessengerProjectMutationPayload) {
  const serviceId = parsePrefixedNumber(payload.serviceId, 'service:')
    || parsePrefixedNumber(payload.objectId, 'service:')

  if (!serviceId) {
    throw createError({ statusCode: 400, statusMessage: 'Выберите доп. услугу для выставления счёта' })
  }

  return await generateExtraServiceDocuments(project.slug, serviceId)
}

export { PROJECT_STATUS_LABELS, workStatusLabel }
