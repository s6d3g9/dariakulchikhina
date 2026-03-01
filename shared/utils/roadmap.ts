export type CanonicalRoadmapStatus = 'pending' | 'in_progress' | 'done' | 'skipped'

const ROADMAP_STATUS_ALIASES: Record<string, CanonicalRoadmapStatus> = {
  done: 'done',
  approved: 'done',
  completed: 'done',
  complete: 'done',
  finished: 'done',
  finish: 'done',
  готово: 'done',
  выполнено: 'done',
  завершено: 'done',
  skipped: 'skipped',
  skip: 'skipped',
  пропущено: 'skipped',
  пропуск: 'skipped',
  in_progress: 'in_progress',
  'in-work': 'in_progress',
  in_work: 'in_progress',
  inprogress: 'in_progress',
  in_progress_now: 'in_progress',
  underway: 'in_progress',
  progress: 'in_progress',
  revision: 'in_progress',
  sent: 'in_progress',
  partial: 'in_progress',
  active: 'in_progress',
  working: 'in_progress',
  processing: 'in_progress',
  'в_работе': 'in_progress',
  'вработе': 'in_progress',
  'в работе': 'in_progress',
  pending: 'pending',
  wait: 'pending',
  waiting: 'pending',
  expected: 'pending',
  todo: 'pending',
  open: 'pending',
  ожидание: 'pending',
  ожидает: 'pending',
}

const PHASE_BY_STAGE_KEY: Record<string, string> = {
  brief: 'lead',
  concept: 'concept',
  planning: 'concept',
  design: 'working_project',
  engineering: 'working_project',
  estimate: 'procurement',
  procurement: 'procurement',
  implementation: 'construction',
  supervision: 'construction',
  handover: 'commissioning',
}

const PHASE_BY_STAGE_INDEX = [
  'lead',
  'concept',
  'working_project',
  'procurement',
  'construction',
  'commissioning',
]

type RoadmapLikeStage = {
  status?: string | null
  stageKey?: string | null
  sortOrder?: number | null
}

const TRACKED_PHASE_KEYS = [
  'lead',
  'concept',
  'working_project',
  'procurement',
  'construction',
  'commissioning',
]

export function normalizeRoadmapStatus(status?: string | null): 'pending' | 'in_progress' | 'done' | 'skipped' {
  const value = String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  return ROADMAP_STATUS_ALIASES[value] || 'pending'
}

export function roadmapPhaseFromStageKey(stageKey?: string | null): string | null {
  const value = String(stageKey || '').toLowerCase()
  return PHASE_BY_STAGE_KEY[value] || null
}

function roadmapPhaseFromStage(stage: RoadmapLikeStage, index: number): string | null {
  return roadmapPhaseFromStageKey(stage.stageKey) || PHASE_BY_STAGE_INDEX[index] || null
}

export function normalizeRoadmapStages<T extends RoadmapLikeStage>(stages: T[]): Array<T & { status: CanonicalRoadmapStatus }> {
  return (stages || []).map((stage) => ({
    ...stage,
    status: normalizeRoadmapStatus(stage.status),
  }))
}

/* ── Unified UI display helpers (single source of truth) ───── */

const STATUS_LABELS: Record<CanonicalRoadmapStatus, string> = {
  pending: 'ожидание',
  in_progress: 'в работе',
  done: 'готово',
  skipped: 'пропущено',
}

const STATUS_ICONS: Record<CanonicalRoadmapStatus, string> = {
  pending: '○',
  in_progress: '◉',
  done: '✓',
  skipped: '—',
}

const STATUS_CSS: Record<CanonicalRoadmapStatus, string> = {
  pending: 'rm-status--pending',
  in_progress: 'rm-status--progress',
  done: 'rm-status--done',
  skipped: 'rm-status--skipped',
}

export function roadmapStatusLabel(status?: string | null): string {
  return STATUS_LABELS[normalizeRoadmapStatus(status)] || 'ожидание'
}

export function roadmapStatusIcon(status?: string | null): string {
  return STATUS_ICONS[normalizeRoadmapStatus(status)] || '○'
}

export function roadmapStatusCssClass(status?: string | null): string {
  return STATUS_CSS[normalizeRoadmapStatus(status)] || 'rm-status--pending'
}

export function roadmapDoneCount(stages: Array<{ status?: string | null }>): number {
  return (stages || []).filter(s => normalizeRoadmapStatus(s.status) === 'done').length
}

export function deriveProjectPhaseFromRoadmap(stages: RoadmapLikeStage[]): string | null {
  const sorted = [...(stages || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  if (!sorted.length) return null

  const normalized = normalizeRoadmapStages(sorted)

  const inProgress = normalized.find((stage) => stage.status === 'in_progress')
  if (inProgress) {
    const index = normalized.indexOf(inProgress)
    return roadmapPhaseFromStage(inProgress, index)
  }

  const pending = normalized.find((stage) => stage.status === 'pending')
  if (pending) {
    const index = normalized.indexOf(pending)
    return roadmapPhaseFromStage(pending, index)
  }

  const allResolved = normalized.every((stage) => stage.status === 'done' || stage.status === 'skipped')
  if (allResolved) return 'completed'

  const lastResolved = [...normalized].reverse().find((stage) => stage.status === 'done' || stage.status === 'skipped')
  if (!lastResolved) return null
  const index = normalized.indexOf(lastResolved)
  return roadmapPhaseFromStage(lastResolved, index)
}

export function roadmapPhaseSubpoints(stages: RoadmapLikeStage[]): Record<string, CanonicalRoadmapStatus[]> {
  const result: Record<string, CanonicalRoadmapStatus[]> = Object.fromEntries(
    TRACKED_PHASE_KEYS.map((key) => [key, [] as CanonicalRoadmapStatus[]])
  )

  const sorted = [...(stages || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const normalized = normalizeRoadmapStages(sorted)

  normalized.forEach((stage, index) => {
    const phaseKey = roadmapPhaseFromStage(stage, index)
    if (!phaseKey || !result[phaseKey]) return
    result[phaseKey].push(stage.status)
  })

  return result
}
