import * as repo from '~/server/modules/projects/project-governance.repository'
import type {
  HybridControl,
  HybridControlPhase,
  HybridControlSprint,
} from '~/shared/types/project'
import type {
  ProjectGovernanceDetailItem,
  ProjectResponsibilityKey,
  ProjectScopeAssignmentOrigin,
  ProjectScopeDetailBundle,
  ProjectScopeLink,
  ProjectScopeParticipantSummary,
  ProjectScopeRuleSummary,
  ProjectScopeSource,
  ProjectScopeTaskSummary,
  ProjectScopeType,
} from '~/shared/types/project-governance'
import {
  buildDefaultProjectScopeSettings,
  buildProjectScopeSettingEntries,
  getProjectParticipantRoleLabel,
  getProjectResponsibilityLabel,
} from '~/shared/utils/project-governance'
import { getHybridCommunicationChannelLabel } from '~/shared/utils/project-control'
import {
  getGovernanceState,
  isRecord,
  joinParts,
  legacyActiveTaskCount,
  normalizeAssignmentStatus,
  normalizeResponsibility,
  normalizeScopeSource,
  normalizeScopeType,
  type GovernanceState,
  type GovernanceSummaryOptions,
  type ProjectGovernanceProjectRow,
} from '~/server/modules/projects/project-governance-state.service'

type ResolvedScopeContext = {
  scopeType: ProjectScopeType
  scopeSource: ProjectScopeSource
  scopeId: string
  title: string
  subtitle: string
  status: string
  statusLabel: string
  core: Record<string, unknown>
  objectItems: ProjectGovernanceDetailItem[]
  actionItems: ProjectGovernanceDetailItem[]
  linkedScopes: ProjectScopeLink[]
  tasks: ProjectScopeTaskSummary[]
  legacyParticipants: Array<{
    displayName: string
    roleKey?: import('~/shared/types/project-governance').ProjectParticipantRoleKey
    responsibility: ProjectResponsibilityKey
    secondary?: string
  }>
}

function phaseStatusLabel(status?: string) {
  switch (status) {
    case 'planned': return 'Запланирована'
    case 'active': return 'В работе'
    case 'blocked': return 'Заблокирована'
    case 'done': return 'Завершена'
    default: return status || 'Без статуса'
  }
}

function sprintStatusLabel(status?: string) {
  switch (status) {
    case 'planned': return 'Запланирован'
    case 'active': return 'Активен'
    case 'review': return 'На ревью'
    case 'done': return 'Завершён'
    default: return status || 'Без статуса'
  }
}

function hybridTaskStatusLabel(status?: string) {
  switch (status) {
    case 'todo': return 'К запуску'
    case 'doing': return 'В работе'
    case 'review': return 'На ревью'
    case 'done': return 'Готово'
    default: return status || 'Без статуса'
  }
}

function workTaskStatusLabel(status?: string) {
  switch (status) {
    case 'planned': return 'Запланировано'
    case 'pending': return 'Ожидание'
    case 'in_progress': return 'В работе'
    case 'paused': return 'На паузе'
    case 'done': return 'Выполнено'
    case 'cancelled': return 'Отменено'
    case 'skipped': return 'Пропущено'
    default: return status || 'Без статуса'
  }
}

function formatDateRange(startDate?: string | null, endDate?: string | null) {
  if (startDate && endDate) {
    return `${startDate} - ${endDate}`
  }

  return startDate || endDate || 'период не задан'
}

export function findScopeSettings(state: GovernanceState, scopeType: ProjectScopeType, scopeSource: ProjectScopeSource, scopeId: string) {
  return state.settingsRows.find(row => normalizeScopeType(row.scopeType) === scopeType
    && normalizeScopeSource(row.scopeSource) === scopeSource
    && row.scopeId === scopeId)
}

function buildRuleItems(state: GovernanceState, subtitle: string): ProjectScopeRuleSummary[] {
  return state.coordination.playbook.slice(0, 4).map(rule => ({
    id: rule.id,
    title: rule.title,
    channel: rule.linkedChannelLabel || getHybridCommunicationChannelLabel(rule.linkedChannel),
    trigger: rule.trigger,
    audience: rule.audienceLabels.length ? rule.audienceLabels.join(' · ') : subtitle,
  }))
}

function createTaskSummary(id: string, title: string, status: string, statusLabel: string, assigneeLabels: string[], secondary = ''): ProjectScopeTaskSummary {
  return {
    id,
    title,
    status,
    statusLabel,
    assigneeLabels,
    secondary,
  }
}

function createFallbackParticipantSummary(
  state: GovernanceState,
  entry: { displayName: string; roleKey?: import('~/shared/types/project-governance').ProjectParticipantRoleKey; responsibility: ProjectResponsibilityKey; secondary?: string },
): ProjectScopeParticipantSummary | null {
  const normalizedName = entry.displayName.trim()
  if (!normalizedName) {
    return null
  }

  const matched = state.participants.find(participant => participant.displayName.trim().toLowerCase() === normalizedName.toLowerCase())
  const roleKey = matched?.roleKey || entry.roleKey || 'other'
  const origin: ProjectScopeAssignmentOrigin = 'derived'

  return {
    assignmentId: `derived:${normalizedName}:${entry.responsibility}`,
    participantId: matched?.id || `derived:${normalizedName}`,
    displayName: matched?.displayName || normalizedName,
    roleKey,
    roleLabel: getProjectParticipantRoleLabel(roleKey),
    responsibility: entry.responsibility,
    responsibilityLabel: getProjectResponsibilityLabel(entry.responsibility),
    origin,
    activeTaskCount: matched?.activeTaskCount || legacyActiveTaskCount(state.control, normalizedName),
    secondary: entry.secondary || matched?.secondary || '',
  }
}

function participantSummarySort(left: ProjectScopeParticipantSummary, right: ProjectScopeParticipantSummary) {
  const responsibilityOrder: ProjectResponsibilityKey[] = ['lead', 'owner', 'executor', 'reviewer', 'approver', 'consultant', 'observer']
  const leftIndex = responsibilityOrder.indexOf(left.responsibility)
  const rightIndex = responsibilityOrder.indexOf(right.responsibility)
  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex
  }

  if (left.origin !== right.origin) {
    return ['direct', 'project', 'derived'].indexOf(left.origin) - ['direct', 'project', 'derived'].indexOf(right.origin)
  }

  return left.displayName.localeCompare(right.displayName, 'ru')
}

export function buildScopeParticipantSummaries(
  state: GovernanceState,
  scopeType: ProjectScopeType,
  scopeSource: ProjectScopeSource,
  scopeId: string,
  fallbackParticipants: ResolvedScopeContext['legacyParticipants'],
) {
  const directAssignments = state.assignmentRows.filter(row => normalizeAssignmentStatus(row.status) !== 'removed'
    && normalizeScopeType(row.scopeType) === scopeType
    && normalizeScopeSource(row.scopeSource) === scopeSource
    && row.scopeId === scopeId)

  const projectAssignments = state.assignmentRows.filter(row => normalizeAssignmentStatus(row.status) !== 'removed'
    && normalizeScopeType(row.scopeType) === 'project'
    && normalizeScopeSource(row.scopeSource) === 'project'
    && row.scopeId === state.project.slug)

  const summaries: ProjectScopeParticipantSummary[] = []
  const seen = new Set<string>()

  const appendAssignment = (row: GovernanceState['assignmentRows'][number], origin: ProjectScopeAssignmentOrigin) => {
    const participant = state.participantByPersistedId.get(row.participantId)
    if (!participant) {
      return
    }

    const responsibility = normalizeResponsibility(row.responsibility)
    const key = `${participant.id}:${responsibility}:${origin}`
    if (seen.has(key)) {
      return
    }

    seen.add(key)
    summaries.push({
      assignmentId: `assignment:${row.id}`,
      participantId: participant.id,
      displayName: participant.displayName,
      roleKey: participant.roleKey,
      roleLabel: getProjectParticipantRoleLabel(participant.roleKey),
      responsibility,
      responsibilityLabel: getProjectResponsibilityLabel(responsibility),
      origin,
      activeTaskCount: participant.activeTaskCount,
      secondary: participant.secondary,
    })
  }

  directAssignments.forEach(row => appendAssignment(row, 'direct'))
  projectAssignments.forEach(row => appendAssignment(row, 'project'))

  if (!summaries.length) {
    fallbackParticipants.forEach((entry) => {
      const summary = createFallbackParticipantSummary(state, entry)
      if (!summary) {
        return
      }

      const key = `${summary.participantId}:${summary.responsibility}:${summary.origin}`
      if (seen.has(key)) {
        return
      }

      seen.add(key)
      summaries.push(summary)
    })

    const shouldAppendDerivedProjectParticipants = state.assignmentRows.length === 0 && state.participantByPersistedId.size === 0
    if (shouldAppendDerivedProjectParticipants) {
      state.participants.forEach((participant) => {
        const key = `${participant.id}:observer:derived`
        if (seen.has(key)) {
          return
        }

        seen.add(key)
        summaries.push({
          assignmentId: `derived:${participant.id}:observer`,
          participantId: participant.id,
          displayName: participant.displayName,
          roleKey: participant.roleKey,
          roleLabel: getProjectParticipantRoleLabel(participant.roleKey),
          responsibility: 'observer',
          responsibilityLabel: getProjectResponsibilityLabel('observer'),
          origin: 'derived',
          activeTaskCount: participant.activeTaskCount,
          secondary: participant.secondary,
        })
      })
    }
  }

  return summaries.sort(participantSummarySort)
}

function buildSubjectItems(participants: ProjectScopeParticipantSummary[]) {
  return participants.map((participant) => ({
    key: `subject:${participant.assignmentId}`,
    label: `${participant.roleLabel} · ${participant.responsibilityLabel}`,
    value: joinParts([participant.displayName, participant.secondary]),
  }))
}

function findPhase(control: HybridControl, scopeId: string) {
  return control.phases.find(phase => phase.id === scopeId || phase.phaseKey === scopeId) || null
}

function findSprint(control: HybridControl, scopeId: string) {
  return control.sprints.find(sprint => sprint.id === scopeId) || null
}

function findHybridTask(control: HybridControl, scopeId: string) {
  const normalizedId = scopeId.startsWith('hybrid:') ? scopeId.slice('hybrid:'.length) : scopeId

  for (const sprint of control.sprints) {
    const task = sprint.tasks.find(item => item.id === normalizedId)
    if (task) {
      return { sprint, task }
    }
  }

  return null
}

function buildPhaseScopeContext(state: GovernanceState, phase: HybridControlPhase): ResolvedScopeContext {
  const linkedSprints = state.control.sprints.filter(sprint => sprint.linkedPhaseKey === phase.phaseKey)
  const linkedTasks = linkedSprints.flatMap(sprint => sprint.tasks.map(task => ({ sprint, task })))
  const taskSummaries = linkedTasks.map(({ sprint, task }) => createTaskSummary(
    `hybrid:${task.id}`,
    task.title,
    task.status,
    hybridTaskStatusLabel(task.status),
    task.assignee ? [task.assignee] : [],
    joinParts([sprint.name, formatDateRange(sprint.startDate, sprint.endDate)]),
  ))

  return {
    scopeType: 'phase',
    scopeSource: 'hybrid-control',
    scopeId: phase.id,
    title: phase.title,
    subtitle: joinParts([phaseStatusLabel(phase.status), formatDateRange(phase.startDate, phase.endDate)]),
    status: phase.status,
    statusLabel: phaseStatusLabel(phase.status),
    core: {
      phaseKey: phase.phaseKey,
      percent: phase.percent,
      owner: phase.owner || '',
      deliverable: phase.deliverable || '',
      notes: phase.notes || '',
      startDate: phase.startDate || '',
      endDate: phase.endDate || '',
    },
    objectItems: [
      { key: 'deliverable', label: 'Результат', value: phase.deliverable || 'результат не зафиксирован' },
      { key: 'linked-sprints', label: 'Связанные спринты', value: linkedSprints.length ? linkedSprints.map(sprint => sprint.name).join(' · ') : 'спринты ещё не привязаны' },
      { key: 'task-count', label: 'Задачи контура', value: linkedTasks.length ? `${linkedTasks.length} задач в связанных спринтах` : 'задачи ещё не заведены' },
    ],
    actionItems: [
      ...(phase.gates || []).map(gate => ({
        key: `gate:${gate.id}`,
        label: gate.label,
        value: gate.done ? 'готово' : 'ожидает закрытия',
      })),
      ...state.control.checkpoints.slice(0, 2).map(checkpoint => ({
        key: `checkpoint:${checkpoint.id}`,
        label: checkpoint.title,
        value: checkpoint.note || checkpoint.status,
      })),
    ].slice(0, 8),
    linkedScopes: linkedSprints.map(sprint => ({
      scopeType: 'sprint',
      scopeSource: 'hybrid-control',
      scopeId: sprint.id,
      title: sprint.name,
      status: sprint.status,
      statusLabel: sprintStatusLabel(sprint.status),
    })),
    tasks: taskSummaries,
    legacyParticipants: [
      ...(phase.owner ? [{ displayName: phase.owner, responsibility: 'owner' as const, secondary: 'legacy поле phase.owner' }] : []),
      ...Array.from(new Set(linkedTasks.map(({ task }) => (task.assignee || '').trim()).filter(Boolean))).map(name => ({
        displayName: name,
        responsibility: 'executor' as const,
        secondary: 'исполнитель из задач спринта',
      })),
    ],
  }
}

function buildSprintScopeContext(state: GovernanceState, sprint: HybridControlSprint): ResolvedScopeContext {
  const linkedPhase = sprint.linkedPhaseKey ? state.control.phases.find(phase => phase.phaseKey === sprint.linkedPhaseKey) : null
  const taskSummaries = sprint.tasks.map(task => createTaskSummary(
    `hybrid:${task.id}`,
    task.title,
    task.status,
    hybridTaskStatusLabel(task.status),
    task.assignee ? [task.assignee] : [],
    joinParts([linkedPhase?.title, formatDateRange(task.dueDate, undefined)]),
  ))

  return {
    scopeType: 'sprint',
    scopeSource: 'hybrid-control',
    scopeId: sprint.id,
    title: sprint.name,
    subtitle: joinParts([linkedPhase?.title, formatDateRange(sprint.startDate, sprint.endDate)]),
    status: sprint.status,
    statusLabel: sprintStatusLabel(sprint.status),
    core: {
      linkedPhaseKey: sprint.linkedPhaseKey || '',
      linkedPhaseTitle: linkedPhase?.title || '',
      goal: sprint.goal || '',
      focus: sprint.focus || '',
      retrospective: sprint.retrospective || '',
      startDate: sprint.startDate || '',
      endDate: sprint.endDate || '',
    },
    objectItems: [
      { key: 'phase', label: 'Фаза', value: linkedPhase?.title || 'без фазы' },
      { key: 'goal', label: 'Цель', value: sprint.goal || 'цель не описана' },
      { key: 'focus', label: 'Фокус', value: sprint.focus || 'фокус команды не задан' },
      { key: 'retrospective', label: 'Ретроспектива', value: sprint.retrospective || 'ретроспектива ещё не добавлена' },
    ],
    actionItems: [
      ...sprint.tasks.map(task => ({
        key: `task:${task.id}`,
        label: task.title,
        value: `${hybridTaskStatusLabel(task.status)}${task.assignee ? ` · ${task.assignee}` : ''}`,
      })),
      ...state.control.blockers.slice(0, 2).map((blocker, index) => ({
        key: `blocker:${index + 1}`,
        label: `Блокер ${index + 1}`,
        value: blocker,
      })),
    ].slice(0, 8),
    linkedScopes: linkedPhase
      ? [{
          scopeType: 'phase',
          scopeSource: 'hybrid-control',
          scopeId: linkedPhase.id,
          title: linkedPhase.title,
          status: linkedPhase.status,
          statusLabel: phaseStatusLabel(linkedPhase.status),
        }]
      : [],
    tasks: taskSummaries,
    legacyParticipants: [
      ...(linkedPhase?.owner ? [{ displayName: linkedPhase.owner, responsibility: 'owner' as const, secondary: 'владелец связанной фазы' }] : []),
      ...Array.from(new Set(sprint.tasks.map(task => (task.assignee || '').trim()).filter(Boolean))).map(name => ({
        displayName: name,
        responsibility: 'executor' as const,
        secondary: 'исполнитель задачи спринта',
      })),
    ],
  }
}

async function buildTaskScopeContext(state: GovernanceState, scopeId: string): Promise<ResolvedScopeContext | null> {
  const hybridTaskContext = findHybridTask(state.control, scopeId)
  if (hybridTaskContext) {
    const linkedPhase = hybridTaskContext.sprint.linkedPhaseKey
      ? state.control.phases.find(phase => phase.phaseKey === hybridTaskContext.sprint.linkedPhaseKey)
      : null

    return {
      scopeType: 'task',
      scopeSource: 'hybrid-control',
      scopeId: `hybrid:${hybridTaskContext.task.id}`,
      title: hybridTaskContext.task.title,
      subtitle: joinParts([hybridTaskContext.sprint.name, linkedPhase?.title]),
      status: hybridTaskContext.task.status,
      statusLabel: hybridTaskStatusLabel(hybridTaskContext.task.status),
      core: {
        sprintId: hybridTaskContext.sprint.id,
        sprintName: hybridTaskContext.sprint.name,
        phaseTitle: linkedPhase?.title || '',
        assignee: hybridTaskContext.task.assignee || '',
        dueDate: hybridTaskContext.task.dueDate || '',
        notes: hybridTaskContext.task.notes || '',
      },
      objectItems: [
        { key: 'sprint', label: 'Спринт', value: hybridTaskContext.sprint.name },
        { key: 'phase', label: 'Фаза', value: linkedPhase?.title || 'без фазы' },
        { key: 'notes', label: 'Заметки', value: hybridTaskContext.task.notes || 'комментарий пока не добавлен' },
      ],
      actionItems: [
        { key: 'status', label: 'Статус', value: hybridTaskStatusLabel(hybridTaskContext.task.status) },
        { key: 'dueDate', label: 'Дедлайн', value: hybridTaskContext.task.dueDate || 'не назначен' },
      ],
      linkedScopes: [
        {
          scopeType: 'sprint',
          scopeSource: 'hybrid-control',
          scopeId: hybridTaskContext.sprint.id,
          title: hybridTaskContext.sprint.name,
          status: hybridTaskContext.sprint.status,
          statusLabel: sprintStatusLabel(hybridTaskContext.sprint.status),
        },
        ...(linkedPhase ? [{
          scopeType: 'phase' as const,
          scopeSource: 'hybrid-control' as const,
          scopeId: linkedPhase.id,
          title: linkedPhase.title,
          status: linkedPhase.status,
          statusLabel: phaseStatusLabel(linkedPhase.status),
        }] : []),
      ],
      tasks: [createTaskSummary(
        `hybrid:${hybridTaskContext.task.id}`,
        hybridTaskContext.task.title,
        hybridTaskContext.task.status,
        hybridTaskStatusLabel(hybridTaskContext.task.status),
        hybridTaskContext.task.assignee ? [hybridTaskContext.task.assignee] : [],
        hybridTaskContext.task.notes || '',
      )],
      legacyParticipants: [
        ...(linkedPhase?.owner ? [{ displayName: linkedPhase.owner, responsibility: 'owner' as const, secondary: 'владелец фазы' }] : []),
        ...(hybridTaskContext.task.assignee ? [{ displayName: hybridTaskContext.task.assignee, responsibility: 'executor' as const, secondary: 'исполнитель задачи' }] : []),
      ],
    }
  }

  const numericId = Number(scopeId.replace(/^work:/, '').trim())
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null
  }

  const workTask = await repo.findWorkTaskForScope(state.project.id, numericId)

  if (!workTask) {
    return null
  }

  return {
    scopeType: 'task',
    scopeSource: 'work-status',
    scopeId: `work:${workTask.id}`,
    title: workTask.title,
    subtitle: joinParts([workTask.workType, formatDateRange(workTask.dateStart, workTask.dateEnd)]),
    status: workTask.status,
    statusLabel: workTaskStatusLabel(workTask.status),
    core: {
      workType: workTask.workType || '',
      notes: workTask.notes || '',
      assignee: workTask.contractorName || '',
      rangeStart: workTask.dateStart || '',
      rangeEnd: workTask.dateEnd || '',
    },
    objectItems: [
      { key: 'workType', label: 'Вид работ', value: workTask.workType || 'не указан' },
      { key: 'period', label: 'Период', value: formatDateRange(workTask.dateStart, workTask.dateEnd) },
      { key: 'notes', label: 'Заметки', value: workTask.notes || 'без комментария' },
    ],
    actionItems: [
      { key: 'status', label: 'Статус', value: workTaskStatusLabel(workTask.status) },
      { key: 'contractor', label: 'Исполнитель', value: workTask.contractorName || 'не назначен' },
    ],
    linkedScopes: [],
    tasks: [createTaskSummary(
      `work:${workTask.id}`,
      workTask.title,
      workTask.status,
      workTaskStatusLabel(workTask.status),
      workTask.contractorName ? [workTask.contractorName] : [],
      workTask.workType || '',
    )],
    legacyParticipants: workTask.contractorName
      ? [{ displayName: workTask.contractorName, responsibility: 'executor', secondary: 'исполнитель статуса работ' }]
      : [],
  }
}

async function buildDocumentScopeContext(state: GovernanceState, scopeId: string): Promise<ResolvedScopeContext | null> {
  const numericId = Number(scopeId.replace(/^document:/, '').trim())
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null
  }

  const document = await repo.findDocumentForScope(state.project.id, numericId)

  if (!document) {
    return null
  }

  return {
    scopeType: 'document',
    scopeSource: 'documents',
    scopeId: `document:${document.id}`,
    title: document.title,
    subtitle: joinParts([document.category, document.filename || document.templateKey]),
    status: document.category,
    statusLabel: document.category || 'Документ',
    core: {
      category: document.category,
      filename: document.filename || '',
      templateKey: document.templateKey || '',
      notes: document.notes || '',
    },
    objectItems: [
      { key: 'category', label: 'Категория', value: document.category || 'other' },
      { key: 'filename', label: 'Файл', value: document.filename || 'не загружен' },
      { key: 'notes', label: 'Заметки', value: document.notes || 'без заметок' },
    ],
    actionItems: [
      { key: 'template', label: 'Шаблон', value: document.templateKey || 'без шаблона' },
    ],
    linkedScopes: [],
    tasks: [],
    legacyParticipants: [],
  }
}

async function buildServiceScopeContext(state: GovernanceState, scopeId: string): Promise<ResolvedScopeContext | null> {
  const numericId = Number(scopeId.replace(/^service:/, '').trim())
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null
  }

  const service = await repo.findExtraServiceForScope(state.project.id, numericId)

  if (!service) {
    return null
  }

  return {
    scopeType: 'service',
    scopeSource: 'extra-services',
    scopeId: `service:${service.id}`,
    title: service.title,
    subtitle: joinParts([service.requestedBy, service.totalPrice ? `${service.totalPrice} ₽` : '']),
    status: service.status,
    statusLabel: service.status || 'Услуга',
    core: {
      requestedBy: service.requestedBy,
      totalPrice: service.totalPrice || 0,
      description: service.description || '',
    },
    objectItems: [
      { key: 'requestedBy', label: 'Запросил', value: service.requestedBy },
      { key: 'totalPrice', label: 'Стоимость', value: service.totalPrice ? `${service.totalPrice} ₽` : 'не рассчитана' },
      { key: 'description', label: 'Описание', value: service.description || 'описание не заполнено' },
    ],
    actionItems: [],
    linkedScopes: [],
    tasks: [],
    legacyParticipants: [],
  }
}

function buildProjectScopeContext(state: GovernanceState): ResolvedScopeContext {
  const activeTasks = state.control.sprints.flatMap(sprint => sprint.tasks)

  return {
    scopeType: 'project',
    scopeSource: 'project',
    scopeId: state.project.slug,
    title: state.project.title,
    subtitle: joinParts([state.project.status, state.project.projectType]),
    status: state.project.status,
    statusLabel: state.project.status || 'Проект',
    core: {
      projectType: state.project.projectType,
      status: state.project.status,
      activePhaseTitle: state.coordination.summary.activePhaseTitle,
      activeSprintTitle: state.coordination.summary.activeSprintTitle,
    },
    objectItems: [
      { key: 'phase-count', label: 'Фазы', value: `${state.control.phases.length}` },
      { key: 'sprint-count', label: 'Спринты', value: `${state.control.sprints.length}` },
      { key: 'task-count', label: 'Задачи', value: `${activeTasks.length}` },
    ],
    actionItems: state.control.blockers.slice(0, 4).map((blocker, index) => ({
      key: `blocker:${index + 1}`,
      label: `Блокер ${index + 1}`,
      value: blocker,
    })),
    linkedScopes: state.control.phases.map(phase => ({
      scopeType: 'phase',
      scopeSource: 'hybrid-control',
      scopeId: phase.id,
      title: phase.title,
      status: phase.status,
      statusLabel: phaseStatusLabel(phase.status),
    })),
    tasks: activeTasks.slice(0, 8).map(task => createTaskSummary(
      `hybrid:${task.id}`,
      task.title,
      task.status,
      hybridTaskStatusLabel(task.status),
      task.assignee ? [task.assignee] : [],
    )),
    legacyParticipants: [],
  }
}

export async function resolveScopeContext(state: GovernanceState, scopeType: ProjectScopeType, scopeId: string): Promise<ResolvedScopeContext | null> {
  switch (scopeType) {
    case 'project':
      return buildProjectScopeContext(state)
    case 'phase': {
      const phase = findPhase(state.control, scopeId)
      return phase ? buildPhaseScopeContext(state, phase) : null
    }
    case 'sprint': {
      const sprint = findSprint(state.control, scopeId)
      return sprint ? buildSprintScopeContext(state, sprint) : null
    }
    case 'task':
      return await buildTaskScopeContext(state, scopeId)
    case 'document':
      return await buildDocumentScopeContext(state, scopeId)
    case 'service':
      return await buildServiceScopeContext(state, scopeId)
    default:
      return null
  }
}

export function sanitizeGovernanceJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => sanitizeGovernanceJsonValue(item))
  }

  if (!isRecord(value)) {
    return value
  }

  const DANGEROUS_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
  const clean: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (DANGEROUS_JSON_KEYS.has(key)) {
      continue
    }

    clean[key] = sanitizeGovernanceJsonValue(entry)
  }

  return clean
}

export function sanitizeGovernanceRecord(value?: Record<string, unknown> | null): Record<string, string | number | boolean | null> {
  const sanitized = sanitizeGovernanceJsonValue(isRecord(value) ? value : {})
  return (isRecord(sanitized) ? sanitized : {}) as Record<string, string | number | boolean | null>
}

export async function buildProjectGovernanceSummary(project: ProjectGovernanceProjectRow, options: GovernanceSummaryOptions = {}) {
  const state = await getGovernanceState(project, options)

  return {
    revision: state.revision,
    participants: state.participants,
    scopeCounters: getScopeCounts(state.control),
  }
}

function getScopeCounts(control: HybridControl) {
  return {
    project: 1,
    phase: control.phases.length,
    sprint: control.sprints.length,
    task: control.sprints.reduce((total, sprint) => total + sprint.tasks.length, 0),
    document: 0,
    service: 0,
  }
}

export async function buildProjectScopeDetail(project: ProjectGovernanceProjectRow, scopeType: ProjectScopeType, scopeId: string, options: GovernanceSummaryOptions = {}): Promise<ProjectScopeDetailBundle | null> {
  const state = await getGovernanceState(project, options)
  const context = await resolveScopeContext(state, scopeType, scopeId)

  if (!context) {
    return null
  }

  const scopeSettingsRow = findScopeSettings(state, context.scopeType, context.scopeSource, context.scopeId)
  const normalizedSettings = {
    ...buildDefaultProjectScopeSettings(context.scopeType),
    ...(scopeSettingsRow?.settings || {}),
  } as Record<string, string | number | boolean | null>
  const participants = buildScopeParticipantSummaries(state, context.scopeType, context.scopeSource, context.scopeId, context.legacyParticipants)

  return {
    revision: state.revision,
    scope: {
      scopeType: context.scopeType,
      scopeSource: context.scopeSource,
      scopeId: context.scopeId,
      title: context.title,
      subtitle: context.subtitle,
      status: context.status,
      statusLabel: context.statusLabel,
    },
    core: sanitizeGovernanceRecord(context.core),
    settings: normalizedSettings,
    settingItems: buildProjectScopeSettingEntries(context.scopeType, normalizedSettings),
    participants,
    subjectItems: buildSubjectItems(participants),
    objectItems: context.objectItems,
    actionItems: context.actionItems,
    ruleItems: buildRuleItems(state, context.subtitle || context.title),
    linkedScopes: context.linkedScopes,
    tasks: context.tasks,
  }
}
