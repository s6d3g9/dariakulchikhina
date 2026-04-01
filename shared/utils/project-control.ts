import { PHASE_LABELS, PROJECT_PAGES } from '../constants/pages'
import {
  HybridControlSchema,
  type HybridControl,
  type HybridControlCallInsight,
  type HybridControlCommunicationChannel,
  type HybridControlCommunicationRule,
  type HybridControlCoordinationAgentState,
  type HybridControlCoordinationBrief,
  type HybridControlCoordinationRecommendation,
  type HybridControlCoordinationRuleState,
  type HybridControlCheckpoint,
  type HybridControlHealthStatus,
  type HybridControlManagerAgent,
  type HybridControlManagerAgentRole,
  type HybridControlPhase,
  type HybridControlPhaseStatus,
  type HybridControlSprint,
  type HybridControlStakeholderRole,
  type HybridControlTask,
  type ProjectCallInsightIngest,
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

const MANAGER_AGENT_ROLE_LABELS: Record<HybridControlManagerAgentRole, string> = {
  orchestrator: 'Оркестрация',
  risk: 'Риски',
  delivery: 'Исполнение',
  communication: 'Коммуникации',
}

const STAKEHOLDER_ROLE_LABELS: Record<HybridControlStakeholderRole, string> = {
  admin: 'Дизайнер',
  manager: 'Менеджер',
  designer: 'Дизайнер команды',
  client: 'Клиент',
  contractor: 'Подрядчик',
  seller: 'Поставщик',
  service: 'Сервис',
}

const COMMUNICATION_CHANNEL_LABELS: Record<HybridControlCommunicationChannel, string> = {
  'project-room': 'Общий канал проекта',
  'direct-thread': 'Точечный direct',
  handoff: 'Handoff-поток',
  approval: 'Контур согласования',
  'daily-digest': 'Операционный дайджест',
}

const DEFAULT_MANAGER_AGENTS: HybridControlManagerAgent[] = [
  {
    id: 'pm-agent-orchestrator',
    title: 'Оркестратор проекта',
    role: 'orchestrator',
    enabled: true,
    mission: 'Держит общий ритм проекта, обзорные встречи и handoff между участниками.',
    cadenceDays: 3,
    linkedChannel: 'project-room',
    targetRoles: ['admin', 'manager', 'client', 'contractor'],
    notes: '',
  },
  {
    id: 'pm-agent-risk',
    title: 'Контроль рисков',
    role: 'risk',
    enabled: true,
    mission: 'Подсвечивает блокеры, просрочки и критические контрольные точки.',
    cadenceDays: 1,
    linkedChannel: 'handoff',
    targetRoles: ['admin', 'manager', 'contractor'],
    notes: '',
  },
  {
    id: 'pm-agent-delivery',
    title: 'Контроль исполнения',
    role: 'delivery',
    enabled: true,
    mission: 'Следит за спринтами, фазовыми воротами и готовностью поставки.',
    cadenceDays: 2,
    linkedChannel: 'handoff',
    targetRoles: ['admin', 'designer', 'contractor'],
    notes: '',
  },
  {
    id: 'pm-agent-communication',
    title: 'Навигатор коммуникации',
    role: 'communication',
    enabled: true,
    mission: 'Подсказывает, кого и когда подключать к обсуждению, чтобы не терять согласования.',
    cadenceDays: 2,
    linkedChannel: 'approval',
    targetRoles: ['client', 'admin', 'contractor'],
    notes: '',
  },
]

const DEFAULT_COMMUNICATION_PLAYBOOK: HybridControlCommunicationRule[] = [
  {
    id: 'weekly-review',
    title: 'Плановый обзор',
    trigger: 'Срабатывает за 48 часов до review или при смене активной фазы.',
    linkedChannel: 'project-room',
    audience: ['admin', 'client', 'manager'],
    ownerAgentId: 'pm-agent-orchestrator',
    cadenceDays: 7,
    template: 'Собираем короткий обзор проекта: что завершено, что в риске, какие решения нужны от клиента.',
  },
  {
    id: 'blocker-escalation',
    title: 'Эскалация блокеров',
    trigger: 'Срабатывает при появлении блокера, critical checkpoint или просроченного спринта.',
    linkedChannel: 'handoff',
    audience: ['admin', 'manager', 'contractor'],
    ownerAgentId: 'pm-agent-risk',
    cadenceDays: 1,
    template: 'Нужен быстрый risk-sync: фиксируем препятствие, владельца решения, срок и формат следующего апдейта.',
  },
  {
    id: 'sprint-handoff',
    title: 'Handoff по исполнению',
    trigger: 'Срабатывает при переводе спринта в review и перед передачей задач между командами.',
    linkedChannel: 'handoff',
    audience: ['admin', 'designer', 'contractor'],
    ownerAgentId: 'pm-agent-delivery',
    cadenceDays: 3,
    template: 'Фиксируем, что готово к передаче, что ещё не закрыто и кто подтверждает готовность на следующем шаге.',
  },
  {
    id: 'client-approval',
    title: 'Контур согласования',
    trigger: 'Срабатывает для решений клиента по концепции, закупкам и этапам сдачи.',
    linkedChannel: 'approval',
    audience: ['client', 'admin', 'manager'],
    ownerAgentId: 'pm-agent-communication',
    cadenceDays: 4,
    template: 'Формулируем один вопрос на согласование, прикладываем контекст решения и дедлайн ответа.',
  },
  {
    id: 'daily-digest',
    title: 'Операционный дайджест',
    trigger: 'Срабатывает в стабильном состоянии проекта для поддержания прозрачности без лишнего шума.',
    linkedChannel: 'daily-digest',
    audience: ['client', 'contractor', 'manager'],
    ownerAgentId: 'pm-agent-orchestrator',
    cadenceDays: 2,
    template: 'Короткий дайджест: активная фаза, активный спринт, новые риски, кто ждёт ответа и что делаем дальше.',
  },
]

const CALL_DECISION_PATTERN = /решили|согласовали|утвердили|подтвердили|выбрали|фиксируем|договорились|оставляем|берем|делаем/iu
const CALL_NEXT_STEP_PATTERN = /нужно|надо|сделать|подготовить|отправить|согласовать|проверить|назначить|созвон|встрет|следующ(ий|его|ая)|до\s+\d|дедлайн|срок/iu
const CALL_BLOCKER_PATTERN = /блокер|риск|задержк|жд[её]м|не можем|не может|не успева|проблем|узкое место|дорого|не хватает|зависим|стоп|пауза/iu
const CALL_APPROVAL_PATTERN = /согласова|утверд|подтверд|апрув|approval/iu

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

function createDefaultManagerAgents(): HybridControlManagerAgent[] {
  return DEFAULT_MANAGER_AGENTS.map(agent => ({
    ...agent,
    targetRoles: [...agent.targetRoles],
  }))
}

function createDefaultCommunicationPlaybook(): HybridControlCommunicationRule[] {
  return DEFAULT_COMMUNICATION_PLAYBOOK.map(rule => ({
    ...rule,
    audience: [...rule.audience],
  }))
}

function normalizeCallInsightText(value?: string) {
  return value?.trim() || ''
}

function normalizeStringList(values: string[] | undefined, fallback: string[] = []) {
  const source = Array.isArray(values) && values.length ? values : fallback
  const unique = new Set<string>()

  for (const item of source) {
    const normalized = item.trim().replace(/^[-*\d.)\s]+/, '')
    if (!normalized) continue
    unique.add(normalized)
  }

  return Array.from(unique)
}

function splitCallInsightLines(...chunks: Array<string | undefined>) {
  const lines: string[] = []

  for (const chunk of chunks) {
    const normalized = normalizeCallInsightText(chunk)
    if (!normalized) continue

    const rawLines = normalized
      .split(/\n+/)
      .flatMap(line => line.split(/(?<=[.!?])\s+/))

    for (const line of rawLines) {
      const cleaned = line
        .trim()
        .replace(/^(вы|собеседник|клиент|дизайнер|менеджер|подрядчик)\s*:\s*/iu, '')
        .replace(/^[-*\d.)\s]+/, '')

      if (cleaned.length < 6) continue
      lines.push(cleaned)
    }
  }

  return normalizeStringList(lines)
}

function extractMatchingLines(lines: string[], pattern: RegExp, limit = 6) {
  return lines.filter(line => pattern.test(line)).slice(0, limit)
}

function inferCallInsightTone(blockers: string[], approvals: string[], nextSteps: string[], explicitTone?: HybridControlHealthStatus): HybridControlHealthStatus {
  if (explicitTone) return explicitTone

  if (blockers.some(item => /срыв|критич|не можем|стоп|пауза/iu.test(item)) || blockers.length > 1) {
    return 'critical'
  }

  if (blockers.length || approvals.length || nextSteps.length > 3) {
    return 'warning'
  }

  return 'stable'
}

export function extractHybridCallInsight(input: Pick<ProjectCallInsightIngest, 'summary' | 'transcript' | 'decisions' | 'nextSteps' | 'blockers' | 'approvals' | 'tone'>) {
  const lines = splitCallInsightLines(input.summary, input.transcript)
  const decisions = normalizeStringList(input.decisions, extractMatchingLines(lines, CALL_DECISION_PATTERN))
  const nextSteps = normalizeStringList(input.nextSteps, extractMatchingLines(lines, CALL_NEXT_STEP_PATTERN))
  const blockers = normalizeStringList(input.blockers, extractMatchingLines(lines, CALL_BLOCKER_PATTERN))
  const approvals = normalizeStringList(input.approvals, extractMatchingLines(lines, CALL_APPROVAL_PATTERN))
  const tone = inferCallInsightTone(blockers, approvals, nextSteps, input.tone)

  return {
    decisions,
    nextSteps,
    blockers,
    approvals,
    tone,
  }
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

function normalizeManagerAgents(managerAgents: HybridControlManagerAgent[] | undefined): HybridControlManagerAgent[] {
  const defaults = createDefaultManagerAgents()
  if (!Array.isArray(managerAgents) || !managerAgents.length) return defaults

  const usedIds = new Set<string>()
  const normalized = defaults.map((baseAgent) => {
    const incoming = managerAgents.find(agent => agent.id === baseAgent.id)
    if (!incoming) return baseAgent

    usedIds.add(incoming.id)
    return {
      ...baseAgent,
      ...incoming,
      title: incoming.title || baseAgent.title,
      role: incoming.role || baseAgent.role,
      enabled: incoming.enabled ?? baseAgent.enabled,
      mission: incoming.mission || baseAgent.mission,
      cadenceDays: typeof incoming.cadenceDays === 'number' ? incoming.cadenceDays : baseAgent.cadenceDays,
      linkedChannel: incoming.linkedChannel || baseAgent.linkedChannel,
      targetRoles: Array.isArray(incoming.targetRoles) && incoming.targetRoles.length ? incoming.targetRoles : baseAgent.targetRoles,
      notes: incoming.notes || '',
    }
  })

  const customAgents = managerAgents
    .filter(agent => !usedIds.has(agent.id))
    .map((agent, index) => ({
      id: agent.id || `pm-agent-custom-${index + 1}`,
      title: agent.title || `Менеджер-агент ${index + 1}`,
      role: agent.role || 'communication',
      enabled: agent.enabled ?? true,
      mission: agent.mission || '',
      cadenceDays: typeof agent.cadenceDays === 'number' ? agent.cadenceDays : 3,
      linkedChannel: agent.linkedChannel || 'project-room',
      targetRoles: Array.isArray(agent.targetRoles) ? agent.targetRoles : [],
      notes: agent.notes || '',
    }))

  return [...normalized, ...customAgents]
}

function normalizeCommunicationPlaybook(playbook: HybridControlCommunicationRule[] | undefined): HybridControlCommunicationRule[] {
  const defaults = createDefaultCommunicationPlaybook()
  if (!Array.isArray(playbook) || !playbook.length) return defaults

  const usedIds = new Set<string>()
  const normalized = defaults.map((baseRule) => {
    const incoming = playbook.find(rule => rule.id === baseRule.id)
    if (!incoming) return baseRule

    usedIds.add(incoming.id)
    return {
      ...baseRule,
      ...incoming,
      title: incoming.title || baseRule.title,
      trigger: incoming.trigger || baseRule.trigger,
      linkedChannel: incoming.linkedChannel || baseRule.linkedChannel,
      audience: Array.isArray(incoming.audience) && incoming.audience.length ? incoming.audience : baseRule.audience,
      ownerAgentId: incoming.ownerAgentId || baseRule.ownerAgentId,
      cadenceDays: typeof incoming.cadenceDays === 'number' ? incoming.cadenceDays : baseRule.cadenceDays,
      template: incoming.template || baseRule.template,
    }
  })

  const customRules = playbook
    .filter(rule => !usedIds.has(rule.id))
    .map((rule, index) => ({
      id: rule.id || `pm-rule-custom-${index + 1}`,
      title: rule.title || `Правило коммуникации ${index + 1}`,
      trigger: rule.trigger || 'Триггер не описан',
      linkedChannel: rule.linkedChannel || 'project-room',
      audience: Array.isArray(rule.audience) ? rule.audience : [],
      ownerAgentId: rule.ownerAgentId || '',
      cadenceDays: typeof rule.cadenceDays === 'number' ? rule.cadenceDays : undefined,
      template: rule.template || '',
    }))

  return [...normalized, ...customRules]
}

function normalizeCallInsights(callInsights: HybridControlCallInsight[] | undefined): HybridControlCallInsight[] {
  if (!Array.isArray(callInsights) || !callInsights.length) return []

  return callInsights
    .map((insight, index) => ({
      id: insight.id || `hybrid-call-insight-${index + 1}`,
      sourceKind: insight.sourceKind || 'call',
      title: insight.title || `Звонок ${index + 1}`,
      summary: insight.summary || 'Конспект звонка не заполнен.',
      transcript: insight.transcript || '',
      callId: insight.callId || '',
      conversationId: insight.conversationId || '',
      roomExternalRef: insight.roomExternalRef || '',
      actorRole: insight.actorRole,
      actorName: insight.actorName || '',
      happenedAt: insight.happenedAt || '',
      createdAt: insight.createdAt || new Date().toISOString(),
      relatedPhaseKey: insight.relatedPhaseKey || '',
      tone: insight.tone || 'stable',
      decisions: normalizeStringList(insight.decisions),
      nextSteps: normalizeStringList(insight.nextSteps),
      blockers: normalizeStringList(insight.blockers),
      approvals: normalizeStringList(insight.approvals),
      appliedCheckpointId: insight.appliedCheckpointId || '',
      appliedSprintId: insight.appliedSprintId || '',
      appliedTaskIds: normalizeStringList(insight.appliedTaskIds),
      appliedAt: insight.appliedAt || '',
    }))
    .sort((left, right) => {
      const rightValue = safeDateValue(right.happenedAt || right.createdAt || '') || 0
      const leftValue = safeDateValue(left.happenedAt || left.createdAt || '') || 0
      return rightValue - leftValue
    })
}

export function createDefaultHybridControl(project: ProjectSnapshot = {}): HybridControl {
  return {
    manager: '',
    cadenceDays: 7,
    nextReviewDate: toIsoDate(addDays(new Date(), 7)),
    lastSyncAt: '',
    phases: createDefaultPhases(project),
    sprints: [],
    team: [],
    checkpoints: createDefaultCheckpoints(),
    managerAgents: createDefaultManagerAgents(),
    communicationPlaybook: createDefaultCommunicationPlaybook(),
    callInsights: [],
    tasks: [],
    communicationLog: [],
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
    team: value.team || base.team,
    tasks: value.tasks || base.tasks,
    communicationLog: value.communicationLog || base.communicationLog,
    checkpoints: normalizeCheckpoints(value.checkpoints),
    managerAgents: normalizeManagerAgents(value.managerAgents),
    communicationPlaybook: normalizeCommunicationPlaybook(value.communicationPlaybook),
    callInsights: normalizeCallInsights(value.callInsights),
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

export function getHybridControlManagerAgentRoleLabel(role: HybridControlManagerAgentRole) {
  return MANAGER_AGENT_ROLE_LABELS[role]
}

export function getHybridStakeholderRoleLabel(role: HybridControlStakeholderRole) {
  return STAKEHOLDER_ROLE_LABELS[role]
}

export function getHybridCommunicationChannelLabel(channel: HybridControlCommunicationChannel) {
  return COMMUNICATION_CHANNEL_LABELS[channel]
}

function buildHybridCallInsightTitle(input: ProjectCallInsightIngest, happenedAt: string) {
  const explicitTitle = normalizeCallInsightText(input.title)
  if (explicitTitle) return explicitTitle
  return `Звонок ${happenedAt.slice(0, 10)}`
}

export function ingestHybridControlCallInsight(control: HybridControl, input: ProjectCallInsightIngest) {
  const createdAt = new Date().toISOString()
  const happenedAt = normalizeCallInsightText(input.happenedAt) || createdAt
  const title = buildHybridCallInsightTitle(input, happenedAt)
  const extracted = extractHybridCallInsight(input)

  const existingInsight = control.callInsights.find((insight) => {
    if (input.callId && insight.callId === input.callId) return true
    if (input.conversationId && insight.conversationId === input.conversationId && insight.summary === input.summary.trim()) return true
    return false
  }) || null

  let checkpointId = existingInsight?.appliedCheckpointId || ''
  let checkpointCreated = false
  let nextCheckpoints = [...control.checkpoints]

  if (extracted.tone !== 'stable' || extracted.approvals.length || extracted.decisions.length) {
    const checkpointTitle = `Звонок: ${title}`
    const checkpointNote = [
      input.summary.trim(),
      ...extracted.decisions.map(item => `Решение: ${item}`),
      ...extracted.nextSteps.slice(0, 3).map(item => `Следующий шаг: ${item}`),
    ].join('\n')

    const existingCheckpoint = checkpointId
      ? nextCheckpoints.find(checkpoint => checkpoint.id === checkpointId)
      : nextCheckpoints.find(checkpoint => checkpoint.category === 'call' && checkpoint.title === checkpointTitle)

    if (existingCheckpoint) {
      existingCheckpoint.status = extracted.tone
      existingCheckpoint.note = checkpointNote
      checkpointId = existingCheckpoint.id
    } else {
      checkpointId = `hybrid-call-checkpoint-${Date.now()}`
      nextCheckpoints = [
        {
          id: checkpointId,
          title: checkpointTitle,
          category: 'call',
          status: extracted.tone,
          note: checkpointNote,
        },
        ...nextCheckpoints,
      ]
      checkpointCreated = true
    }
  }

  const blockerSet = new Set(control.blockers.map(item => item.trim()).filter(Boolean))
  let blockerCountAdded = 0

  for (const blocker of extracted.blockers) {
    if (blockerSet.has(blocker)) continue
    blockerSet.add(blocker)
    blockerCountAdded += 1
  }

  const nextInsight: HybridControlCallInsight = {
    id: existingInsight?.id || `hybrid-call-insight-${Date.now()}`,
    sourceKind: 'call',
    title,
    summary: input.summary.trim(),
    transcript: normalizeCallInsightText(input.transcript),
    callId: normalizeCallInsightText(input.callId),
    conversationId: normalizeCallInsightText(input.conversationId),
    roomExternalRef: normalizeCallInsightText(input.roomExternalRef),
    actorRole: input.actorRole,
    actorName: normalizeCallInsightText(input.actorName),
    happenedAt,
    createdAt: existingInsight?.createdAt || createdAt,
    relatedPhaseKey: normalizeCallInsightText(input.relatedPhaseKey),
    tone: extracted.tone,
    decisions: extracted.decisions,
    nextSteps: extracted.nextSteps,
    blockers: extracted.blockers,
    approvals: extracted.approvals,
    appliedCheckpointId: checkpointId || undefined,
    appliedSprintId: existingInsight?.appliedSprintId,
    appliedTaskIds: existingInsight?.appliedTaskIds || [],
    appliedAt: existingInsight?.appliedAt,
  }

  const nextInsights = existingInsight
    ? control.callInsights.map(insight => insight.id === existingInsight.id ? nextInsight : insight)
    : [nextInsight, ...control.callInsights]

  return {
    control: {
      ...control,
      checkpoints: nextCheckpoints,
      callInsights: normalizeCallInsights(nextInsights.slice(0, 24)),
      blockers: Array.from(blockerSet),
      lastSyncAt: happenedAt,
    },
    insight: nextInsight,
    blockerCountAdded,
    checkpointCreated,
  }
}

function normalizeTaskTitle(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function buildCallInsightTaskNotes(insight: HybridControlCallInsight) {
  const lines = [
    `Создано из звонка: ${insight.title}`,
    insight.summary,
  ]

  if (insight.blockers.length) {
    lines.push(`Блокеры: ${insight.blockers.join('; ')}`)
  }

  return lines.filter(Boolean).join('\n\n')
}

function resolveCallInsightTargetSprint(control: HybridControl, insight: HybridControlCallInsight, targetSprintId?: string) {
  if (targetSprintId) {
    const sprint = control.sprints.find(item => item.id === targetSprintId)
    if (sprint) return { sprint, created: false }
  }

  const activeSprint = control.sprints.find(item => item.status === 'active' || item.status === 'review')
  if (activeSprint) return { sprint: activeSprint, created: false }

  const phaseSprint = insight.relatedPhaseKey
    ? control.sprints.find(item => item.linkedPhaseKey === insight.relatedPhaseKey && item.status !== 'done')
    : null
  if (phaseSprint) return { sprint: phaseSprint, created: false }

  const plannedSprint = control.sprints.find(item => item.status === 'planned')
  if (plannedSprint) return { sprint: plannedSprint, created: false }

  const summary = buildHybridControlSummary(control)
  const phaseKey = insight.relatedPhaseKey || summary.activePhase?.phaseKey || 'construction'
  const startDate = new Date()
  const endDate = control.nextReviewDate || toIsoDate(addDays(startDate, 7))
  const createdSprint: HybridControlSprint = {
    id: `hybrid-sprint-call-${Date.now()}`,
    name: `Фоллоу-ап: ${insight.title}`,
    linkedPhaseKey: phaseKey,
    goal: `Отработать следующие шаги после звонка «${insight.title}».`,
    focus: insight.nextSteps.slice(0, 3).join('; '),
    status: 'active',
    startDate: toIsoDate(startDate),
    endDate,
    retrospective: '',
    tasks: [],
  }

  control.sprints.push(createdSprint)
  return { sprint: createdSprint, created: true }
}

export function applyHybridCallInsightToSprint(control: HybridControl, insightId: string, options: { targetSprintId?: string } = {}) {
  const workingControl = ensureHybridControl(control)
  const insight = workingControl.callInsights.find(item => item.id === insightId)
  if (!insight) {
    throw new Error('CALL_INSIGHT_NOT_FOUND')
  }

  const candidateTitles = normalizeStringList(insight.nextSteps)
  if (!candidateTitles.length) {
    return {
      control: workingControl,
      insight,
      sprint: null,
      createdTaskCount: 0,
      createdSprint: false,
    }
  }

  const { sprint, created } = resolveCallInsightTargetSprint(workingControl, insight, options.targetSprintId)
  const existingTitles = new Set(sprint.tasks.map(task => normalizeTaskTitle(task.title)))
  const taskNotes = buildCallInsightTaskNotes(insight)
  const createdTaskIds: string[] = []

  for (const title of candidateTitles) {
    const normalizedTitle = normalizeTaskTitle(title)
    if (!normalizedTitle || existingTitles.has(normalizedTitle)) continue

    const taskId = `hybrid-task-call-${Date.now()}-${createdTaskIds.length + 1}`
    sprint.tasks.push({
      id: taskId,
      title,
      status: 'todo',
      assignee: '',
      dueDate: sprint.endDate || workingControl.nextReviewDate || '',
      points: 1,
      notes: taskNotes,
    })
    existingTitles.add(normalizedTitle)
    createdTaskIds.push(taskId)
  }

  const nextAppliedTaskIds = Array.from(new Set([...(insight.appliedTaskIds || []), ...createdTaskIds]))
  const appliedAt = createdTaskIds.length ? new Date().toISOString() : (insight.appliedAt || '')

  const nextInsights = workingControl.callInsights.map((item) => {
    if (item.id !== insight.id) return item
    return {
      ...item,
      appliedSprintId: sprint.id,
      appliedTaskIds: nextAppliedTaskIds,
      appliedAt,
    }
  })

  const nextControl = ensureHybridControl({
    ...workingControl,
    callInsights: nextInsights,
  })

  return {
    control: nextControl,
    insight: nextControl.callInsights.find(item => item.id === insight.id) || insight,
    sprint: nextControl.sprints.find(item => item.id === sprint.id) || sprint,
    createdTaskCount: createdTaskIds.length,
    createdSprint: created,
  }
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

function buildCoordinationExternalRef(projectSlug: string | undefined, channel: HybridControlCommunicationChannel) {
  if (!projectSlug) return ''
  if (channel === 'project-room') return `project:${projectSlug}`
  if (channel === 'direct-thread') return `project:${projectSlug}:direct:coordination`
  if (channel === 'handoff') return `project:${projectSlug}:group:handoff`
  if (channel === 'approval') return `project:${projectSlug}:group:approval`
  return `project:${projectSlug}:group:digest`
}

function resolveCoordinationOwner(control: HybridControl, ownerAgentId?: string, fallbackRole: HybridControlManagerAgentRole = 'orchestrator') {
  return control.managerAgents.find(agent => agent.enabled && agent.id === ownerAgentId)
    || control.managerAgents.find(agent => agent.enabled && agent.role === fallbackRole)
    || control.managerAgents.find(agent => agent.enabled)
    || null
}

function buildCoordinationRecommendation(input: {
  control: HybridControl
  title: string
  reason: string
  tone: HybridControlHealthStatus
  rule: HybridControlCommunicationRule | null
  fallbackRole?: HybridControlManagerAgentRole
  audience?: HybridControlStakeholderRole[]
  suggestedMessage: string
  projectSlug?: string
}): HybridControlCoordinationRecommendation {
  const owner = resolveCoordinationOwner(input.control, input.rule?.ownerAgentId, input.fallbackRole)
  const channel = input.rule?.linkedChannel || owner?.linkedChannel || 'project-room'
  const audience = input.rule?.audience?.length ? input.rule.audience : (input.audience || owner?.targetRoles || [])

  return {
    id: input.rule?.id || `${channel}-${input.title}`,
    title: input.title,
    reason: input.reason,
    tone: input.tone,
    channel,
    channelLabel: getHybridCommunicationChannelLabel(channel),
    audience,
    audienceLabels: audience.map(getHybridStakeholderRoleLabel),
    ownerAgentId: owner?.id || '',
    ownerAgentTitle: owner?.title || 'Не назначен',
    messengerExternalRef: buildCoordinationExternalRef(input.projectSlug, channel),
    suggestedMessage: input.suggestedMessage,
  }
}

export function buildHybridCoordinationBrief(control: HybridControl, options: { projectSlug?: string } = {}): HybridControlCoordinationBrief {
  const summary = buildHybridControlSummary(control)
  const playbookById = new Map(control.communicationPlaybook.map(rule => [rule.id, rule]))
  const recommendations: HybridControlCoordinationRecommendation[] = []

  if (summary.blockerCount > 0 || summary.criticalCount > 0) {
    recommendations.push(buildCoordinationRecommendation({
      control,
      title: 'Созвать эскалацию по блокерам',
      reason: `В проекте ${summary.blockerCount} блокеров и ${summary.criticalCount} критических контрольных точек.`,
      tone: 'critical',
      rule: playbookById.get('blocker-escalation') || null,
      fallbackRole: 'risk',
      suggestedMessage: `Нужен быстрый sync по блокерам проекта: фиксируем препятствия, владельцев решений и крайние сроки закрытия. Активная фаза: ${summary.activePhase?.title || 'не определена'}.`,
      projectSlug: options.projectSlug,
    }))
  }

  if (summary.overdueSprints > 0) {
    recommendations.push(buildCoordinationRecommendation({
      control,
      title: 'Пересобрать handoff по просроченным спринтам',
      reason: `Есть ${summary.overdueSprints} просроченных спринтов, которые требуют пересборки ответственности и сроков.`,
      tone: 'critical',
      rule: playbookById.get('sprint-handoff') || null,
      fallbackRole: 'delivery',
      suggestedMessage: `Нужен handoff по исполнению: сверяем, что реально готово, что зависло, и кто подтверждает следующий шаг по просроченным спринтам.`,
      projectSlug: options.projectSlug,
    }))
  }

  if (summary.daysToReview !== null && summary.daysToReview <= 2) {
    recommendations.push(buildCoordinationRecommendation({
      control,
      title: summary.daysToReview <= 0 ? 'Обзор проекта просрочен' : 'Подготовить плановый обзор проекта',
      reason: summary.daysToReview <= 0
        ? 'Дата следующего обзора уже наступила или прошла.'
        : `До следующего обзора проекта осталось ${summary.daysToReview} дн.`,
      tone: summary.daysToReview <= 0 ? 'warning' : 'stable',
      rule: playbookById.get('weekly-review') || null,
      fallbackRole: 'orchestrator',
      suggestedMessage: `Собираем обзор проекта: активная фаза — ${summary.activePhase?.title || 'не определена'}, активный спринт — ${summary.activeSprint?.name || 'нет активного спринта'}, блокеры — ${summary.blockerCount}.`,
      projectSlug: options.projectSlug,
    }))
  }

  if (summary.activeSprint?.status === 'review') {
    recommendations.push(buildCoordinationRecommendation({
      control,
      title: 'Запустить контур согласования по спринту',
      reason: `Спринт «${summary.activeSprint.name}» находится на ревью и требует согласования следующего шага.`,
      tone: 'warning',
      rule: playbookById.get('client-approval') || null,
      fallbackRole: 'communication',
      suggestedMessage: `Нужен один короткий approval-loop по спринту «${summary.activeSprint.name}»: что принимаем, что дорабатываем и кто даёт финальный ответ.`,
      projectSlug: options.projectSlug,
    }))
  }

  if (!recommendations.length) {
    recommendations.push(buildCoordinationRecommendation({
      control,
      title: 'Отправить спокойный операционный дайджест',
      reason: 'Проект идёт без критических сигналов, полезно поддержать прозрачность коротким статус-апдейтом.',
      tone: 'stable',
      rule: playbookById.get('daily-digest') || null,
      fallbackRole: 'orchestrator',
      suggestedMessage: `Короткий дайджест проекта: активная фаза — ${summary.activePhase?.title || 'не определена'}, активный спринт — ${summary.activeSprint?.name || 'нет активного спринта'}, новых блокеров нет.`,
      projectSlug: options.projectSlug,
    }))
  }

  const agents: HybridControlCoordinationAgentState[] = control.managerAgents.map((agent) => ({
    id: agent.id,
    title: agent.title,
    role: agent.role,
    roleLabel: getHybridControlManagerAgentRoleLabel(agent.role),
    enabled: agent.enabled,
    mission: agent.mission || '',
    cadenceDays: agent.cadenceDays,
    linkedChannel: agent.linkedChannel,
    linkedChannelLabel: getHybridCommunicationChannelLabel(agent.linkedChannel),
    targetRoles: agent.targetRoles,
    targetRoleLabels: agent.targetRoles.map(getHybridStakeholderRoleLabel),
    recommendedActionCount: recommendations.filter(item => item.ownerAgentId === agent.id).length,
    notes: agent.notes || '',
  }))

  const playbook: HybridControlCoordinationRuleState[] = control.communicationPlaybook.map((rule) => {
    const owner = control.managerAgents.find(agent => agent.id === rule.ownerAgentId) || null
    return {
      id: rule.id,
      title: rule.title,
      trigger: rule.trigger,
      linkedChannel: rule.linkedChannel,
      linkedChannelLabel: getHybridCommunicationChannelLabel(rule.linkedChannel),
      audience: rule.audience,
      audienceLabels: rule.audience.map(getHybridStakeholderRoleLabel),
      ownerAgentId: owner?.id || '',
      ownerAgentTitle: owner?.title || 'Не назначен',
      cadenceDays: rule.cadenceDays ?? null,
      template: rule.template || '',
    }
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
    agents,
    playbook,
    recommendations,
  }
}