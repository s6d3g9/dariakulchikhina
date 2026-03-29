import { PHASE_LABELS, PROJECT_PAGES } from '../constants/pages'
import {
  HybridControlSchema,
  type HybridControl,
  type HybridControlCheckpoint,
  type HybridControlHealthStatus,
  type HybridControlPhase,
  type HybridControlPhaseStatus,
  type HybridControlSprint,
  type HybridControlTask,
} from '../types/project'

type ProjectSnapshot = {
  pages?: string[]
  status?: string
  profile?: Record<string, any>
}

const HYBRID_PHASE_ORDER = [
  'lead',
  'concept',
  'working_project',
  'procurement',
  'construction',
  'commissioning',
] as const

const DEFAULT_DELIVERABLES: Record<string, string> = {
  lead: 'Зафиксированный бриф, аудит и договор',
  concept: 'Утверждённая концепция и сценарий пространства',
  working_project: 'Комплект рабочей документации',
  procurement: 'Закрытая спецификация и план закупок',
  construction: 'Управляемая стройка без критических блокеров',
  commissioning: 'Сдача, дефектовка и финальная приёмка',
}

const DEFAULT_GATES: Record<string, string[]> = {
  lead: ['Бриф согласован', 'Договор подписан', 'План фаз утверждён'],
  concept: ['Планировки утверждены', 'Мудборд согласован', 'Концепт зафиксирован'],
  working_project: ['Чертежи собраны', 'Инженерия сведена', 'Альбом готов к выдаче'],
  procurement: ['Смета и спецификация собраны', 'Поставщики подтверждены', 'Сроки поставок зафиксированы'],
  construction: ['Этапы стройки декомпозированы', 'Подрядчики закреплены', 'Контрольные точки заведены'],
  commissioning: ['Punch list закрывается', 'Акты готовы', 'Клиент готов к сдаче'],
}

const DEFAULT_CHECKPOINTS: Array<Pick<HybridControlCheckpoint, 'title' | 'category'>> = [
  { title: 'Сроки', category: 'schedule' },
  { title: 'Бюджет', category: 'budget' },
  { title: 'Качество', category: 'quality' },
  { title: 'Клиентские согласования', category: 'client' },
  { title: 'Ресурсы команды', category: 'team' },
]

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function addDays(base: Date, days: number) {
  const next = new Date(base)
  next.setDate(next.getDate() + days)
  return next
}

function pageProgressForPhase(phaseKey: string, pages: string[]) {
  const phasePages = PROJECT_PAGES.filter(page => page.phase === phaseKey)
  const total = phasePages.length
  const done = phasePages.filter(page => pages.includes(page.slug)).length
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  return { total, done, percent }
}

function inferPhaseStatus(phaseKey: string, projectStatus: string | undefined, percent: number): HybridControlPhaseStatus {
  if (percent >= 100) return 'done'
  if (percent > 0) return 'active'
  if (projectStatus === phaseKey) return 'active'
  const currentIndex = HYBRID_PHASE_ORDER.indexOf((projectStatus as typeof HYBRID_PHASE_ORDER[number]) || 'lead')
  const phaseIndex = HYBRID_PHASE_ORDER.indexOf(phaseKey as typeof HYBRID_PHASE_ORDER[number])
  if (currentIndex > phaseIndex) return 'done'
  return 'planned'
}

function createDefaultPhases(project: ProjectSnapshot): HybridControlPhase[] {
  const pages = Array.isArray(project.pages) ? project.pages : []
  return HYBRID_PHASE_ORDER.map((phaseKey) => {
    const progress = pageProgressForPhase(phaseKey, pages)
    return {
      id: `hybrid-phase-${phaseKey}`,
      phaseKey,
      title: PHASE_LABELS[phaseKey],
      owner: '',
      status: inferPhaseStatus(phaseKey, project.status, progress.percent),
      percent: progress.percent,
      startDate: '',
      endDate: '',
      factEndDate: '',
      deliverable: DEFAULT_DELIVERABLES[phaseKey],
      notes: '',
      gates: DEFAULT_GATES[phaseKey].map((label, gateIndex) => ({
        id: `hybrid-gate-${phaseKey}-${gateIndex + 1}`,
        label,
        done: progress.percent >= 100,
      })),
    }
  })
}

function createDefaultCheckpoints(): HybridControlCheckpoint[] {
  return DEFAULT_CHECKPOINTS.map((checkpoint, index) => ({
    id: `hybrid-checkpoint-${index + 1}`,
    title: checkpoint.title,
    category: checkpoint.category,
    status: 'stable',
    note: '',
  }))
}

function normalizeTasks(tasks: HybridControlTask[] | undefined): HybridControlTask[] {
  if (!Array.isArray(tasks)) return []
  return tasks.map((task, index) => ({
    id: task.id || `hybrid-task-${index + 1}`,
    title: task.title || 'Новая задача',
    status: task.status || 'todo',
    assignee: task.assignee || '',
    dueDate: task.dueDate || '',
    points: typeof task.points === 'number' ? task.points : 1,
    notes: task.notes || '',
  }))
}

function normalizePhases(project: ProjectSnapshot, phases: HybridControlPhase[] | undefined) {
  const defaults = createDefaultPhases(project)
  if (!Array.isArray(phases) || !phases.length) return defaults

  return defaults.map((basePhase) => {
    const incoming = phases.find(phase => phase.phaseKey === basePhase.phaseKey || phase.id === basePhase.id)
    if (!incoming) return basePhase
    return {
      ...basePhase,
      ...incoming,
      gates: Array.isArray(incoming.gates) && incoming.gates.length
        ? incoming.gates.map((gate, gateIndex) => ({
            id: gate.id || `${basePhase.id}-gate-${gateIndex + 1}`,
            label: gate.label || basePhase.gates[gateIndex]?.label || `Контрольная точка ${gateIndex + 1}`,
            done: Boolean(gate.done),
          }))
        : basePhase.gates,
      percent: typeof incoming.percent === 'number' ? incoming.percent : basePhase.percent,
      owner: incoming.owner || '',
      notes: incoming.notes || '',
      deliverable: incoming.deliverable || basePhase.deliverable,
    }
  })
}

function normalizeSprints(sprints: HybridControlSprint[] | undefined): HybridControlSprint[] {
  if (!Array.isArray(sprints)) return []
  return sprints.map((sprint, index) => ({
    id: sprint.id || `hybrid-sprint-${index + 1}`,
    name: sprint.name || `Спринт ${index + 1}`,
    linkedPhaseKey: sprint.linkedPhaseKey || 'construction',
    goal: sprint.goal || '',
    focus: sprint.focus || '',
    status: sprint.status || 'planned',
    startDate: sprint.startDate || '',
    endDate: sprint.endDate || '',
    retrospective: sprint.retrospective || '',
    tasks: normalizeTasks(sprint.tasks),
  }))
}

function normalizeCheckpoints(checkpoints: HybridControlCheckpoint[] | undefined): HybridControlCheckpoint[] {
  const defaults = createDefaultCheckpoints()
  if (!Array.isArray(checkpoints) || !checkpoints.length) return defaults

  return checkpoints.map((checkpoint, index) => ({
    id: checkpoint.id || `hybrid-checkpoint-${index + 1}`,
    title: checkpoint.title || defaults[index]?.title || `Контроль ${index + 1}`,
    category: checkpoint.category || defaults[index]?.category || 'control',
    status: checkpoint.status || 'stable',
    note: checkpoint.note || '',
  }))
}

export function createDefaultHybridControl(project: ProjectSnapshot = {}): HybridControl {
  return {
    manager: '',
    cadenceDays: 7,
    nextReviewDate: toIsoDate(addDays(new Date(), 7)),
    lastSyncAt: '',
    phases: createDefaultPhases(project),
    sprints: [],
    checkpoints: createDefaultCheckpoints(),
    blockers: [],
  }
}

export function ensureHybridControl(raw: unknown, project: ProjectSnapshot = {}): HybridControl {
  const base = createDefaultHybridControl(project)
  const parsed = HybridControlSchema.safeParse(raw)
  if (!parsed.success) return base

  const value = parsed.data
  return {
    manager: value.manager || base.manager,
    cadenceDays: value.cadenceDays || base.cadenceDays,
    nextReviewDate: value.nextReviewDate || base.nextReviewDate,
    lastSyncAt: value.lastSyncAt || base.lastSyncAt,
    phases: normalizePhases(project, value.phases),
    sprints: normalizeSprints(value.sprints),
    checkpoints: normalizeCheckpoints(value.checkpoints),
    blockers: Array.isArray(value.blockers) ? value.blockers.filter(Boolean) : [],
  }
}

function safeDateValue(value?: string) {
  if (!value) return null
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : null
}

export function getHealthTone(status: HybridControlHealthStatus) {
  if (status === 'critical') return 'Критично'
  if (status === 'warning') return 'Внимание'
  return 'Стабильно'
}

export function buildHybridControlSummary(control: HybridControl) {
  const phasePercent = control.phases.length
    ? Math.round(control.phases.reduce((sum, phase) => sum + (phase.percent || 0), 0) / control.phases.length)
    : 0

  const allTasks = control.sprints.flatMap(sprint => sprint.tasks)
  const totalTasks = allTasks.length
  const doneTasks = allTasks.filter(task => task.status === 'done').length
  const taskPercent = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0
  const totalPoints = allTasks.reduce((sum, task) => sum + (task.points || 0), 0)
  const donePoints = allTasks
    .filter(task => task.status === 'done')
    .reduce((sum, task) => sum + (task.points || 0), 0)

  const today = Date.now()
  const activePhase = control.phases.find(phase => phase.status === 'active' || phase.status === 'blocked')
    || control.phases.find(phase => phase.status === 'planned')
    || control.phases[control.phases.length - 1]
    || null

  const activeSprint = control.sprints.find(sprint => sprint.status === 'active' || sprint.status === 'review') || null
  const overdueSprints = control.sprints.filter((sprint) => {
    const endDate = safeDateValue(sprint.endDate)
    return Boolean(endDate && endDate < today && sprint.status !== 'done')
  }).length

  const warningCount = control.checkpoints.filter(checkpoint => checkpoint.status === 'warning').length
  const criticalCount = control.checkpoints.filter(checkpoint => checkpoint.status === 'critical').length
  const blockerCount = control.blockers.filter(Boolean).length

  let healthStatus: HybridControlHealthStatus = 'stable'
  if (criticalCount > 0 || blockerCount > 0 || overdueSprints > 0) {
    healthStatus = 'critical'
  } else if (warningCount > 0) {
    healthStatus = 'warning'
  }

  const nextReviewAt = safeDateValue(control.nextReviewDate)
  const daysToReview = nextReviewAt == null ? null : Math.ceil((nextReviewAt - today) / 86400000)

  return {
    phasePercent,
    taskPercent,
    totalTasks,
    doneTasks,
    totalPoints,
    donePoints,
    activePhase,
    activeSprint,
    overdueSprints,
    blockerCount,
    warningCount,
    criticalCount,
    nextReviewDate: control.nextReviewDate || '',
    daysToReview,
    health: {
      status: healthStatus,
      label: getHealthTone(healthStatus),
    },
  }
}