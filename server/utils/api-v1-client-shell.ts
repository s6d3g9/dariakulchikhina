import { buildHybridControlSummary } from '~/shared/utils/project/project-control'
import { PHASE_LABELS } from '~/shared/constants/navigation/pages'
import type {
  ApiV1ClientProjectShell,
  ApiV1ClientProjectShellControlSummary,
  ApiV1ClientProjectShellPhase,
  ApiV1ClientProjectShellProject,
  ApiV1ProjectRef,
} from '~/shared/types/api-v1'

import { createApiV1ClientSafeControl } from './api-v1-client-control'
import { createApiV1ClientProjectTeamDto } from './api-v1-client-team'

type ProjectShellRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  pages: string[]
  profile: Record<string, unknown>
  updatedAt: Date | string | null
}

type ContractorShellRow = {
  id: number
  name: string
  companyName: string | null
  workTypes: string[]
  roleTypes: string[]
  contractorType: string
}

function safeString(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeStringList(values: unknown, maxLength = 120) {
  if (!Array.isArray(values)) return []
  return values
    .map(value => safeString(value, maxLength))
    .filter(Boolean)
}

function createProjectRef(project: ProjectShellRow): ApiV1ProjectRef {
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

function getProjectStatusLabel(status: string) {
  return PHASE_LABELS[status] || status
}

function createShellProject(project: ProjectShellRow): ApiV1ClientProjectShellProject {
  return {
    ...createProjectRef(project),
    pages: safeStringList(project.pages, 120),
    statusLabel: getProjectStatusLabel(project.status),
  }
}

function createShellPhases(phases: ReturnType<typeof createApiV1ClientSafeControl>['phases']): ApiV1ClientProjectShellPhase[] {
  return phases.map(phase => ({
    id: safeString(phase.id, 120),
    phaseKey: safeString(phase.phaseKey, 120),
    title: safeString(phase.title, 240),
    status: safeString(phase.status, 80),
    percent: typeof phase.percent === 'number' ? Math.min(100, Math.max(0, phase.percent)) : 0,
  })).filter(phase => phase.id && phase.phaseKey)
}

function createShellControlSummary(
  control: ReturnType<typeof createApiV1ClientSafeControl>,
): ApiV1ClientProjectShellControlSummary {
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
    healthStatus: safeString(summary.health.status, 80),
    healthLabel: safeString(summary.health.label, 120),
    activePhaseTitle: safeString(summary.activePhase?.title, 240) || 'Фаза не определена',
    activeSprintTitle: safeString(summary.activeSprint?.name, 240) || 'Активного спринта нет',
    blockerCount: summary.blockerCount,
    overdueSprints: summary.overdueSprints,
    totalTasks: summary.totalTasks,
    doneTasks: summary.doneTasks,
    phasePercent: summary.phasePercent,
    taskPercent: summary.taskPercent,
    nextReviewDate: safeString(summary.nextReviewDate, 80),
  }
}

export function createApiV1ClientProjectShellDto(
  project: ProjectShellRow,
  contractors: ContractorShellRow[],
): ApiV1ClientProjectShell {
  const control = createApiV1ClientSafeControl(project.profile?.hybridControl, project)
  const team = createApiV1ClientProjectTeamDto(project, contractors)

  return {
    project: createShellProject(project),
    overview: {
      phases: createShellPhases(control.phases),
      controlSummary: createShellControlSummary(control),
    },
    team,
  }
}
