import { buildHybridControlSummary, ensureHybridControl } from '~/shared/utils/project/project-control'
import type { ApiV1ClientProjectControl, ApiV1ClientProjectControlState, ApiV1ProjectRef } from '~/shared/types/api-v1'
import type {
  HybridControl,
  HybridControlCallInsight,
  HybridControlCheckpoint,
  HybridControlCoordinationBrief,
  HybridControlGate,
  HybridControlPhase,
  HybridControlSprint,
  HybridControlTask,
} from '~/shared/types/project/project'

type ProjectControlRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  pages: string[]
  profile: Record<string, unknown>
  updatedAt: Date | string | null
}

function safeString(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeStringList(values: unknown, maxLength = 240) {
  if (!Array.isArray(values)) return []
  return values
    .map(value => safeString(value, maxLength))
    .filter(Boolean)
}

function createProjectRef(project: ProjectControlRow): ApiV1ProjectRef {
  const updatedAt = project.updatedAt instanceof Date
    ? project.updatedAt.toISOString()
    : safeString(project.updatedAt)

  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    updatedAt,
  }
}

function sanitizeGates(gates: HybridControlGate[]): HybridControlGate[] {
  return gates.map(gate => ({
    id: safeString(gate.id, 120),
    label: safeString(gate.label, 240),
    done: Boolean(gate.done),
  })).filter(gate => gate.id && gate.label)
}

function sanitizeTasks(tasks: HybridControlTask[]): HybridControlTask[] {
  return tasks.map(task => ({
    id: safeString(task.id, 120),
    title: safeString(task.title, 240) || 'Задача',
    status: task.status,
    dueDate: safeString(task.dueDate, 40),
    points: typeof task.points === 'number' ? task.points : 1,
  })).filter(task => task.id)
}

function sanitizePhases(phases: HybridControlPhase[]): HybridControlPhase[] {
  return phases.map(phase => ({
    id: safeString(phase.id, 120),
    phaseKey: safeString(phase.phaseKey, 120),
    title: safeString(phase.title, 240) || 'Фаза',
    status: phase.status,
    percent: typeof phase.percent === 'number' ? Math.min(100, Math.max(0, phase.percent)) : 0,
    startDate: safeString(phase.startDate, 40),
    endDate: safeString(phase.endDate, 40),
    factEndDate: safeString(phase.factEndDate, 40),
    deliverable: safeString(phase.deliverable, 500),
    gates: sanitizeGates(phase.gates || []),
  })).filter(phase => phase.id && phase.phaseKey)
}

function sanitizeSprints(sprints: HybridControlSprint[]): HybridControlSprint[] {
  return sprints.map(sprint => ({
    id: safeString(sprint.id, 120),
    name: safeString(sprint.name, 240) || 'Спринт',
    linkedPhaseKey: safeString(sprint.linkedPhaseKey, 120),
    goal: safeString(sprint.goal, 500),
    focus: safeString(sprint.focus, 500),
    status: sprint.status,
    startDate: safeString(sprint.startDate, 40),
    endDate: safeString(sprint.endDate, 40),
    tasks: sanitizeTasks(sprint.tasks || []),
  })).filter(sprint => sprint.id)
}

function sanitizeCheckpoints(checkpoints: HybridControlCheckpoint[]): HybridControlCheckpoint[] {
  return checkpoints.map(checkpoint => ({
    id: safeString(checkpoint.id, 120),
    title: safeString(checkpoint.title, 240) || 'Контрольная точка',
    category: safeString(checkpoint.category, 80) || 'control',
    status: checkpoint.status,
  })).filter(checkpoint => checkpoint.id)
}

function sanitizeCallInsights(callInsights: HybridControlCallInsight[]): HybridControlCallInsight[] {
  return callInsights.map(insight => ({
    id: safeString(insight.id, 120),
    sourceKind: 'call',
    title: safeString(insight.title, 240) || 'Звонок',
    summary: safeString(insight.summary, 1200) || 'Краткий итог не заполнен.',
    createdAt: safeString(insight.createdAt, 80) || new Date().toISOString(),
    happenedAt: safeString(insight.happenedAt, 80),
    relatedPhaseKey: safeString(insight.relatedPhaseKey, 120),
    tone: insight.tone,
    clientVisible: insight.clientVisible === true,
    decisions: safeStringList(insight.decisions),
    nextSteps: safeStringList(insight.nextSteps),
    blockers: safeStringList(insight.blockers),
    approvals: safeStringList(insight.approvals),
    appliedCheckpointId: safeString(insight.appliedCheckpointId, 120),
    appliedSprintId: safeString(insight.appliedSprintId, 120),
    appliedTaskIds: safeStringList(insight.appliedTaskIds, 120),
    appliedAt: safeString(insight.appliedAt, 80),
  })).filter(insight => insight.id)
}

export function createApiV1ClientSafeControl(rawControl: unknown, project: ProjectControlRow): ApiV1ClientProjectControlState {
  const control = ensureHybridControl(rawControl, project)

  return {
    cadenceDays: control.cadenceDays,
    nextReviewDate: safeString(control.nextReviewDate, 40),
    lastSyncAt: safeString(control.lastSyncAt, 80),
    phases: sanitizePhases(control.phases || []),
    sprints: sanitizeSprints(control.sprints || []),
    checkpoints: sanitizeCheckpoints(control.checkpoints || []),
    callInsights: sanitizeCallInsights((control.callInsights || []).filter(insight => insight.clientVisible === true)),
    blockers: safeStringList(control.blockers, 300),
  }
}

export function createApiV1ClientSafeCoordinationBrief(control: ApiV1ClientProjectControlState): HybridControlCoordinationBrief {
  const summary = buildHybridControlSummary({
    manager: '',
    team: [],
    tasks: [],
    communicationLog: [],
    managerAgents: [],
    communicationPlaybook: [],
    ...control,
  })

  return {
    summary: {
      healthStatus: summary.health.status,
      healthLabel: summary.health.label,
      activePhaseTitle: summary.activePhase?.title || 'Фаза не определена',
      activeSprintTitle: summary.activeSprint?.name || 'Активного спринта нет',
      blockerCount: summary.blockerCount,
      overdueSprints: summary.overdueSprints,
      nextReviewDate: summary.nextReviewDate,
    },
    agents: [],
    playbook: [],
    recommendations: [],
  }
}

export function createApiV1ClientProjectControlDto(project: ProjectControlRow): ApiV1ClientProjectControl {
  const rawControl = project.profile?.hybridControl
  const control = createApiV1ClientSafeControl(rawControl, project)

  return {
    project: createProjectRef(project),
    control,
    coordinationBrief: createApiV1ClientSafeCoordinationBrief(control),
  }
}
