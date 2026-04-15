import { and, eq, sql } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { contractors, projectExtraServices, projects, workStatusItems } from '~/server/db/schema'
import { generateExtraServiceDocuments } from '~/server/utils/extra-service-documents'
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

type ProjectRow = {
  id: number
  slug: string
  title: string
  status: string
  pages: string[]
  profile: Record<string, unknown>
}

const HYBRID_TASK_STATUS_LABELS: Record<HybridControlTaskStatus, string> = {
  todo: 'к выполнению',
  doing: 'в работе',
  review: 'на проверке',
  done: 'выполнено',
}

function normalizePayloadText(value?: string) {
  return value?.trim() || ''
}

function parsePrefixedNumber(value: string | undefined, prefix: string) {
  if (!value?.startsWith(prefix)) {
    return null
  }

  const parsed = Number(value.slice(prefix.length))
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function parsePrefixedText(value: string | undefined, prefix: string) {
  if (!value?.startsWith(prefix)) {
    return ''
  }

  return value.slice(prefix.length).trim()
}

function resolveProjectStatus(status: string): ProjectStatus {
  return PROJECT_STATUSES.includes(status as ProjectStatus)
    ? status as ProjectStatus
    : 'lead'
}

function resolveNextProjectStatus(status: ProjectStatus) {
  const currentIndex = PROJECT_STATUSES.indexOf(status)
  if (currentIndex < 0 || currentIndex >= PROJECT_STATUSES.length - 1) {
    return status
  }

  return PROJECT_STATUSES[currentIndex + 1]!
}

function buildTaskNotes(
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

async function loadProject(slug: string) {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      pages: projects.pages,
      profile: projects.profile,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  return {
    db,
    project: {
      ...project,
      pages: Array.isArray(project.pages) ? project.pages : [],
      profile: project.profile && typeof project.profile === 'object'
        ? project.profile as Record<string, unknown>
        : {},
    } satisfies ProjectRow,
  }
}

async function assertContractorExists(contractorId: number) {
  const db = useDb()
  const [contractor] = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1)

  if (!contractor) {
    throw createError({ statusCode: 404, statusMessage: 'Подрядчик не найден' })
  }
}

async function createWorkStatusTask(project: ProjectRow, payload: MessengerProjectMutationPayload) {
  const db = useDb()
  const contractorId = parsePrefixedNumber(payload.subjectId, 'contractor:')
  if (contractorId) {
    await assertContractorExists(contractorId)
  }

  const [sortRow] = await db
    .select({ maxSort: sql<number>`coalesce(max(${workStatusItems.sortOrder}), -1)` })
    .from(workStatusItems)
    .where(eq(workStatusItems.projectId, project.id))

  const notes = buildTaskNotes(payload, {
    includeSubjectLabel: Boolean(payload.subjectLabel) && !contractorId,
  })

  const [created] = await db
    .insert(workStatusItems)
    .values({
      projectId: project.id,
      contractorId: contractorId || null,
      title: normalizePayloadText(payload.taskTitle) || 'Новая задача',
      status: 'pending',
      dateStart: normalizePayloadText(payload.rangeStart) || null,
      dateEnd: normalizePayloadText(payload.rangeEnd) || null,
      notes: notes || null,
      sortOrder: Number(sortRow?.maxSort ?? -1) + 1,
    })
    .returning({
      id: workStatusItems.id,
      title: workStatusItems.title,
    })

  return created
}

async function updateWorkStatusTask(
  project: ProjectRow,
  payload: MessengerProjectMutationPayload,
  actionId: 'assign_task' | 'update_work_status',
) {
  const db = useDb()
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

  const nextValues: Partial<typeof workStatusItems.$inferInsert> = {}
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

  const [updated] = await db
    .update(workStatusItems)
    .set(nextValues)
    .where(and(
      eq(workStatusItems.id, taskId),
      eq(workStatusItems.projectId, project.id),
    ))
    .returning({
      id: workStatusItems.id,
      title: workStatusItems.title,
      status: workStatusItems.status,
    })

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Задача не найдена' })
  }

  return updated
}

function resolveWorkStatusStatus(value?: string): CanonicalWorkStatus {
  const normalized = normalizePayloadText(value)
  if (!normalized) {
    throw createError({ statusCode: 400, statusMessage: 'Выберите новый статус задачи' })
  }

  return normalizeWorkStatus(normalized)
}

function resolveHybridTaskStatus(value?: string): HybridControlTaskStatus {
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

function findHybridTask(control: HybridControl, taskId: string) {
  for (const sprint of control.sprints) {
    const task = sprint.tasks.find(item => item.id === taskId)
    if (task) {
      return { sprint, task }
    }
  }

  return null
}

function resolveHybridSprint(control: HybridControl, project: ProjectRow, payload: MessengerProjectMutationPayload) {
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

function createHybridTask(control: HybridControl, project: ProjectRow, payload: MessengerProjectMutationPayload) {
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

function updateHybridTask(control: HybridControl, payload: MessengerProjectMutationPayload, actionId: 'assign_task' | 'update_work_status') {
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

async function persistHybridControl(project: ProjectRow, control: HybridControl) {
  const db = useDb()
  const nextControl = ensureHybridControl(control, project)

  await db
    .update(projects)
    .set({
      profile: {
        ...project.profile,
        hybridControl: nextControl,
      } as any,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, project.id))

  return nextControl
}

async function setProjectStatus(project: ProjectRow, actionId: 'accept_stage' | 'change_phase', payload: MessengerProjectMutationPayload) {
  const db = useDb()
  const currentStatus = resolveProjectStatus(project.status)
  const requestedStatus = normalizePayloadText(payload.phaseKey)
  const resolvedTarget = PROJECT_STATUSES.includes(requestedStatus as ProjectStatus)
    ? requestedStatus as ProjectStatus
    : currentStatus
  const targetStatus = actionId === 'accept_stage'
    ? resolveNextProjectStatus(resolvedTarget)
    : resolvedTarget

  const [updated] = await db
    .update(projects)
    .set({
      status: targetStatus,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, project.id))
    .returning({
      slug: projects.slug,
      status: projects.status,
    })

  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  return updated
}

async function createExtraService(project: ProjectRow, payload: MessengerProjectMutationPayload) {
  const db = useDb()
  const title = normalizePayloadText(payload.serviceTitle)
    || normalizePayloadText(payload.objectLabel)
    || normalizePayloadText(payload.note).slice(0, 120)
    || 'Дополнительная услуга'
  const description = buildTaskNotes(payload)

  const [created] = await db
    .insert(projectExtraServices)
    .values({
      projectId: project.id,
      requestedBy: 'admin',
      title,
      description: description || null,
      quantity: '1',
      unit: 'услуга',
      status: 'quoted',
      adminNotes: normalizePayloadText(payload.note) || null,
    })
    .returning({
      id: projectExtraServices.id,
      title: projectExtraServices.title,
    })

  return created
}

async function createExtraServiceInvoice(project: ProjectRow, payload: MessengerProjectMutationPayload) {
  const serviceId = parsePrefixedNumber(payload.serviceId, 'service:')
    || parsePrefixedNumber(payload.objectId, 'service:')

  if (!serviceId) {
    throw createError({ statusCode: 400, statusMessage: 'Выберите доп. услугу для выставления счёта' })
  }

  return await generateExtraServiceDocuments(project.slug, serviceId)
}

export async function executeProjectCommunicationAction(
  slug: string,
  actionId: MessengerProjectMutationActionId,
  payload: MessengerProjectMutationPayload,
): Promise<ProjectCommunicationActionResult> {
  const { project } = await loadProject(slug)

  switch (actionId) {
    case 'create_task': {
      if (normalizePayloadText(payload.sprintId)) {
        const control = ensureHybridControl(project.profile.hybridControl, project)
        const task = createHybridTask(control, project, payload)
        await persistHybridControl(project, control)
        return {
          message: `Задача добавлена в контроль проекта: ${task.title}`,
          mutation: {
            kind: 'hybrid-task',
            id: task.id,
            label: task.title,
          },
        }
      }

      const task = await createWorkStatusTask(project, payload)
      return {
        message: `Задача добавлена в статус работ: ${task.title}`,
        mutation: {
          kind: 'work-status',
          id: String(task.id),
          label: task.title,
        },
      }
    }

    case 'assign_task': {
      if (payload.taskMode === 'existing') {
        if (payload.taskId?.startsWith('hybrid:')) {
          const control = ensureHybridControl(project.profile.hybridControl, project)
          const task = updateHybridTask(control, payload, 'assign_task')
          await persistHybridControl(project, control)
          return {
            message: `Задача обновлена в контроле проекта: ${task.title}`,
            mutation: {
              kind: 'hybrid-task',
              id: task.id,
              label: task.title,
            },
          }
        }

        const task = await updateWorkStatusTask(project, payload, 'assign_task')
        return {
          message: `Задача переназначена: ${task.title}`,
          mutation: {
            kind: 'work-status',
            id: String(task.id),
            label: task.title,
          },
        }
      }

      const contractorId = parsePrefixedNumber(payload.subjectId, 'contractor:')
      if (normalizePayloadText(payload.sprintId) && !contractorId) {
        const control = ensureHybridControl(project.profile.hybridControl, project)
        const task = createHybridTask(control, project, payload)
        await persistHybridControl(project, control)
        return {
          message: `Задача добавлена в контроль проекта: ${task.title}`,
          mutation: {
            kind: 'hybrid-task',
            id: task.id,
            label: task.title,
          },
        }
      }

      const task = await createWorkStatusTask(project, payload)
      return {
        message: `Задача назначена в статус работ: ${task.title}`,
        mutation: {
          kind: 'work-status',
          id: String(task.id),
          label: task.title,
        },
      }
    }

    case 'update_work_status': {
      if (payload.taskId?.startsWith('hybrid:')) {
        const control = ensureHybridControl(project.profile.hybridControl, project)
        const task = updateHybridTask(control, payload, 'update_work_status')
        await persistHybridControl(project, control)
        return {
          message: `Статус задачи обновлён: ${HYBRID_TASK_STATUS_LABELS[task.status]}`,
          mutation: {
            kind: 'hybrid-task',
            id: task.id,
            label: task.title,
          },
        }
      }

      const task = await updateWorkStatusTask(project, payload, 'update_work_status')
      return {
        message: `Статус задачи обновлён: ${payload.taskStatusLabel || workStatusLabel(task.status)}`,
        mutation: {
          kind: 'work-status',
          id: String(task.id),
          label: task.title,
        },
      }
    }

    case 'change_phase':
    case 'accept_stage': {
      const updated = await setProjectStatus(project, actionId, payload)
      const label = PROJECT_STATUS_LABELS[resolveProjectStatus(updated.status)] || updated.status
      return {
        message: actionId === 'accept_stage'
          ? `Этап принят. Текущая фаза: ${label}`
          : `Фаза проекта обновлена: ${label}`,
        mutation: {
          kind: 'project-status',
          id: updated.slug,
          label,
        },
      }
    }

    case 'order_extra_service': {
      const service = await createExtraService(project, payload)
      return {
        message: `Доп. услуга добавлена: ${service.title}`,
        mutation: {
          kind: 'extra-service',
          id: String(service.id),
          label: service.title,
        },
      }
    }

    case 'create_invoice': {
      const result = await createExtraServiceInvoice(project, payload)
      return {
        message: 'Счёт и доп. соглашение сформированы',
        mutation: {
          kind: 'document',
          id: String(result.invoiceDoc.id),
          label: result.invoiceDoc.title,
        },
      }
    }

    default:
      throw createError({
        statusCode: 400,
        statusMessage: 'Действие пока не поддерживается для прямой записи из чата',
      })
  }
}