import { buildHybridControlSummary } from '~/shared/utils/project/project-control'
import type {
  ApiV1ClientProjectControlState,
  ApiV1ClientProjectRoadmap,
  ApiV1ClientProjectRoadmapSummary,
  ApiV1ClientRoadmapCheckpoint,
  ApiV1ClientRoadmapPhase,
  ApiV1ClientRoadmapReport,
  ApiV1ClientRoadmapSprint,
  ApiV1ClientRoadmapStatus,
  ApiV1ProjectRef,
} from '~/shared/types/api-v1'

import { createApiV1ClientSafeControl } from './api-v1-client-control'

type ProjectRoadmapRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  pages: string[]
  profile: Record<string, unknown>
  updatedAt: Date | string | null
}

const PHASE_STATUS_LABELS: Record<string, string> = {
  planned: 'запланировано',
  active: 'в работе',
  blocked: 'требует внимания',
  done: 'завершено',
}

const SPRINT_STATUS_LABELS: Record<string, string> = {
  planned: 'запланировано',
  active: 'в работе',
  review: 'на проверке',
  done: 'завершено',
}

const HEALTH_STATUS_LABELS: Record<string, string> = {
  stable: 'стабильно',
  warning: 'внимание',
  critical: 'критично',
}

function safeString(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeStringList(values: unknown, maxLength = 280, limit = 4) {
  if (!Array.isArray(values)) return []
  return values
    .map(value => safeString(value, maxLength))
    .filter(Boolean)
    .slice(0, limit)
}

function asIso(value: Date | string | null | undefined) {
  if (value instanceof Date) return value.toISOString()
  return safeString(value, 80)
}

function createProjectRef(project: ProjectRoadmapRow): ApiV1ProjectRef {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    updatedAt: asIso(project.updatedAt),
  }
}

function clampPercent(value: unknown) {
  return typeof value === 'number' ? Math.min(100, Math.max(0, Math.round(value))) : 0
}

function isOverdue(endDate: string, status: string) {
  if (!endDate || status === 'done') return false
  const parsed = new Date(endDate)
  if (Number.isNaN(parsed.getTime())) return false
  return parsed.getTime() < Date.now()
}

function normalizeRoadmapStatus(value: string): ApiV1ClientRoadmapStatus {
  if (value === 'planned'
    || value === 'active'
    || value === 'review'
    || value === 'blocked'
    || value === 'done'
    || value === 'stable'
    || value === 'warning'
    || value === 'critical') {
    return value
  }
  return 'planned'
}

function normalizeRoadmapTone(value: string): ApiV1ClientRoadmapStatus {
  if (value === 'critical' || value === 'blocked') return 'critical'
  if (value === 'warning') return 'warning'
  return 'stable'
}

function createRoadmapPhases(control: ApiV1ClientProjectControlState, activePhaseKey: string): ApiV1ClientRoadmapPhase[] {
  return control.phases.map((phase) => {
    const gates = Array.isArray(phase.gates) ? phase.gates : []
    const status = normalizeRoadmapStatus(phase.status)

    return {
      id: safeString(phase.id, 120),
      phaseKey: safeString(phase.phaseKey, 120),
      title: safeString(phase.title, 240) || 'Фаза',
      status,
      statusLabel: PHASE_STATUS_LABELS[status] || status,
      percent: clampPercent(phase.percent),
      startDate: safeString(phase.startDate, 40),
      endDate: safeString(phase.endDate, 40),
      factEndDate: safeString(phase.factEndDate, 40),
      deliverable: safeString(phase.deliverable, 500),
      gatesTotal: gates.length,
      gatesDone: gates.filter(gate => gate.done).length,
      active: safeString(phase.phaseKey, 120) === activePhaseKey,
    }
  }).filter(phase => phase.id && phase.phaseKey)
}

function createRoadmapSprints(control: ApiV1ClientProjectControlState, activeSprintId: string): ApiV1ClientRoadmapSprint[] {
  return control.sprints.map((sprint) => {
    const tasks = Array.isArray(sprint.tasks) ? sprint.tasks : []
    const tasksDone = tasks.filter(task => task.status === 'done').length
    const status = normalizeRoadmapStatus(sprint.status)

    return {
      id: safeString(sprint.id, 120),
      linkedPhaseKey: safeString(sprint.linkedPhaseKey, 120),
      name: safeString(sprint.name, 240) || 'Спринт',
      status,
      statusLabel: SPRINT_STATUS_LABELS[status] || status,
      startDate: safeString(sprint.startDate, 40),
      endDate: safeString(sprint.endDate, 40),
      goal: safeString(sprint.goal, 500),
      focus: safeString(sprint.focus, 500),
      tasksTotal: tasks.length,
      tasksDone,
      progressPercent: tasks.length ? Math.round((tasksDone / tasks.length) * 100) : 0,
      overdue: isOverdue(sprint.endDate || '', status),
      active: safeString(sprint.id, 120) === activeSprintId,
    }
  }).filter(sprint => sprint.id)
}

function createRoadmapCheckpoints(control: ApiV1ClientProjectControlState): ApiV1ClientRoadmapCheckpoint[] {
  return control.checkpoints.map((checkpoint) => {
    const status = normalizeRoadmapStatus(checkpoint.status)
    return {
      id: safeString(checkpoint.id, 120),
      title: safeString(checkpoint.title, 240) || 'Контрольная точка',
      category: safeString(checkpoint.category, 80) || 'control',
      status,
      statusLabel: HEALTH_STATUS_LABELS[status] || status,
    }
  }).filter(checkpoint => checkpoint.id)
}

function insightTimestamp(report: { occurredAt: string }) {
  const parsed = new Date(report.occurredAt)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

function createRoadmapReports(control: ApiV1ClientProjectControlState): ApiV1ClientRoadmapReport[] {
  return control.callInsights
    .filter(insight => insight.clientVisible === true)
    .map((insight) => {
      const tone = normalizeRoadmapTone(insight.tone)
      return {
        id: safeString(insight.id, 120),
        title: safeString(insight.title, 240) || 'Отчёт',
        summary: safeString(insight.summary, 700),
        tone,
        toneLabel: HEALTH_STATUS_LABELS[tone] || tone,
        occurredAt: safeString(insight.happenedAt || insight.createdAt, 80),
        relatedPhaseKey: safeString(insight.relatedPhaseKey, 120),
        decisions: safeStringList(insight.decisions, 280, 3),
        nextSteps: safeStringList(insight.nextSteps, 280, 3),
        blockers: safeStringList(insight.blockers, 280, 3),
        approvals: safeStringList(insight.approvals, 280, 3),
      }
    })
    .filter(report => report.id)
    .sort((a, b) => insightTimestamp(b) - insightTimestamp(a))
    .slice(0, 6)
}

function findNextMilestoneTitle(
  phases: ApiV1ClientRoadmapPhase[],
  sprints: ApiV1ClientRoadmapSprint[],
  summary: ReturnType<typeof buildHybridControlSummary>,
) {
  const activeSprint = sprints.find(sprint => sprint.active)
  if (activeSprint) return activeSprint.name

  const activePhase = phases.find(phase => phase.active)
  if (activePhase) {
    const gateProgress = activePhase.gatesTotal
      ? `${activePhase.gatesDone}/${activePhase.gatesTotal}`
      : `${activePhase.percent}%`
    return `${activePhase.title} · ${gateProgress}`
  }

  return safeString(summary.activePhase?.title, 240) || 'Следующий этап не определён'
}

function createRoadmapSummary(
  control: ApiV1ClientProjectControlState,
  phases: ApiV1ClientRoadmapPhase[],
  sprints: ApiV1ClientRoadmapSprint[],
): ApiV1ClientProjectRoadmapSummary {
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
    healthStatus: summary.health.status,
    healthLabel: summary.health.label,
    activePhaseTitle: safeString(summary.activePhase?.title, 240) || 'Фаза не определена',
    activeSprintTitle: safeString(summary.activeSprint?.name, 240) || 'Активного спринта нет',
    nextMilestoneTitle: findNextMilestoneTitle(phases, sprints, summary),
    nextReviewDate: safeString(summary.nextReviewDate, 80),
    phasePercent: clampPercent(summary.phasePercent),
    taskPercent: clampPercent(summary.taskPercent),
    totalTasks: summary.totalTasks,
    doneTasks: summary.doneTasks,
    completedPhases: phases.filter(phase => phase.status === 'done').length,
    totalPhases: phases.length,
    blockerCount: summary.blockerCount,
    overdueSprints: summary.overdueSprints,
  }
}

export function createApiV1ClientProjectRoadmapDto(project: ProjectRoadmapRow): ApiV1ClientProjectRoadmap {
  const control = createApiV1ClientSafeControl(project.profile?.hybridControl, project)
  const controlSummary = buildHybridControlSummary({
    manager: '',
    team: [],
    tasks: [],
    communicationLog: [],
    managerAgents: [],
    communicationPlaybook: [],
    ...control,
  })
  const activePhaseKey = safeString(controlSummary.activePhase?.phaseKey, 120)
  const activeSprintId = safeString(controlSummary.activeSprint?.id, 120)
  const phases = createRoadmapPhases(control, activePhaseKey)
  const sprints = createRoadmapSprints(control, activeSprintId)

  return {
    project: createProjectRef(project),
    summary: createRoadmapSummary(control, phases, sprints),
    phases,
    sprints,
    checkpoints: createRoadmapCheckpoints(control),
    reports: createRoadmapReports(control),
  }
}
