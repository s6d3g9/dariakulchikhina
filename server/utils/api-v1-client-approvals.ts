import { ensureHybridControl } from '~/shared/utils/project/project-control'
import type {
  ApiV1ClientApprovalActor,
  ApiV1ClientApprovalDecision,
  ApiV1ClientApprovalHistoryItem,
  ApiV1ClientApprovalKind,
  ApiV1ClientApprovalOption,
  ApiV1ClientApprovalScopeRef,
  ApiV1ClientPendingApproval,
  ApiV1ClientProjectApprovals,
  ApiV1ProjectRef,
} from '~/shared/types/api-v1'
import type { HybridControlCallInsight, HybridControlGate, HybridControlPhase } from '~/shared/types/project'

type ProjectApprovalsRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  pages: string[]
  profile: Record<string, unknown>
  updatedAt: Date | string | null
}

type DocumentApprovalRow = {
  id: number
  category: string
  title: string
  filename: string | null
  url: string | null
  createdAt: Date | string | null
}

type ExtraServiceApprovalRow = {
  id: number
  requestedBy: string
  title: string
  description: string | null
  totalPrice: number | null
  status: string
  clientNotes: string | null
  contractDocId: number | null
  invoiceDocId: number | null
  createdAt: Date | string | null
  updatedAt: Date | string | null
}

const CLIENT_APPROVAL_PATTERN = /согласова|утверд|утвержд|подтверд|подпис|при[её]мк|approval|approve|sign.?off|accept/iu
const REJECTION_PATTERN = /откл|отказ|reject|cancel|не\s+соглас|не\s+подтверд/iu
const CHANGES_PATTERN = /доработ|правк|измен|коррект|changes|revision/iu
const APPROVED_PATTERN = /согласован|согласовали|утвержд[её]н|утвердили|подтвержд[её]н|подтвердили|подписан|подписали|принят|приняли|approved|signed|accepted/iu

function safeString(value: unknown, maxLength = 1000) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value).slice(0, maxLength)
  if (typeof value === 'boolean') return String(value)
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeDate(value: unknown) {
  if (value instanceof Date) return value.toISOString()
  return safeString(value, 80)
}

function createProjectRef(project: ProjectApprovalsRow): ApiV1ProjectRef {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    updatedAt: safeDate(project.updatedAt),
  }
}

function clientSectionUrl(projectSlug: string, section: string) {
  return `/client/${encodeURIComponent(projectSlug)}?section=${encodeURIComponent(section)}`
}

function createScopeRef(input: {
  type: ApiV1ClientApprovalScopeRef['type']
  id: string
  title: string
  href: string
}): ApiV1ClientApprovalScopeRef {
  return {
    type: input.type,
    id: safeString(input.id, 200),
    title: safeString(input.title, 500),
    href: safeString(input.href, 1000),
  }
}

function actionOptions(...values: ApiV1ClientApprovalOption['value'][]): ApiV1ClientApprovalOption[] {
  const labels: Record<ApiV1ClientApprovalOption['value'], string> = {
    approve: 'Согласовать',
    reject: 'Отклонить',
    request_changes: 'Запросить правки',
    open: 'Открыть',
  }

  return values.map(value => ({ value, label: labels[value] }))
}

function isPastDate(value: string) {
  if (!value) return false
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return false
  return timestamp < Date.now()
}

function isApprovalText(...values: unknown[]) {
  return values.some(value => CLIENT_APPROVAL_PATTERN.test(safeString(value, 1000)))
}

function normalizeDecision(value: unknown): ApiV1ClientApprovalDecision {
  const text = safeString(value, 1000)
  if (REJECTION_PATTERN.test(text)) return 'rejected'
  if (CHANGES_PATTERN.test(text)) return 'changes_requested'
  if (APPROVED_PATTERN.test(text)) return 'approved'
  return 'recorded'
}

function decisionLabel(decision: ApiV1ClientApprovalDecision) {
  if (decision === 'approved') return 'согласовано'
  if (decision === 'rejected') return 'отклонено'
  if (decision === 'changes_requested') return 'нужны правки'
  if (decision === 'cancelled') return 'отменено'
  if (decision === 'pending') return 'ожидает решения'
  return 'зафиксировано'
}

function createPending(input: {
  id: string
  kind: ApiV1ClientApprovalKind
  title: string
  summary?: string
  scopeRef: ApiV1ClientApprovalScopeRef
  requestedAt?: string
  dueDate?: string
  blocking?: boolean
  awaiting?: 'client' | 'studio'
  sourceUrl: string
  sourceLabel: string
  options?: ApiV1ClientApprovalOption[]
}): ApiV1ClientPendingApproval {
  const awaiting = input.awaiting || 'client'

  return {
    id: safeString(input.id, 240),
    kind: input.kind,
    title: safeString(input.title, 500) || 'Согласование',
    summary: safeString(input.summary, 1200),
    scopeRef: input.scopeRef,
    requestedAt: safeDate(input.requestedAt),
    dueDate: safeDate(input.dueDate),
    blocking: Boolean(input.blocking),
    awaiting,
    status: awaiting === 'client' ? 'pending' : 'awaiting_studio',
    statusLabel: awaiting === 'client' ? 'ожидает клиента' : 'готовится студией',
    sourceUrl: safeString(input.sourceUrl, 1000),
    sourceLabel: safeString(input.sourceLabel, 240),
    options: input.options || actionOptions('open'),
    clientVisible: true,
  }
}

function createHistory(input: {
  id: string
  kind: ApiV1ClientApprovalKind
  title: string
  summary?: string
  scopeRef: ApiV1ClientApprovalScopeRef
  decision: ApiV1ClientApprovalDecision
  decidedBy?: ApiV1ClientApprovalActor
  decidedAt?: string
  comment?: string
  revision?: string
  sourceUrl: string
  sourceLabel: string
}): ApiV1ClientApprovalHistoryItem {
  const decision = input.decision

  return {
    id: safeString(input.id, 240),
    kind: input.kind,
    title: safeString(input.title, 500) || 'Решение',
    summary: safeString(input.summary, 1200),
    scopeRef: input.scopeRef,
    decision,
    decisionLabel: decisionLabel(decision),
    decidedBy: input.decidedBy || { role: 'system', displayName: 'Состояние проекта' },
    decidedAt: safeDate(input.decidedAt),
    comment: safeString(input.comment, 2000),
    revision: safeString(input.revision, 240),
    sourceUrl: safeString(input.sourceUrl, 1000),
    sourceLabel: safeString(input.sourceLabel, 240),
    clientVisible: true,
  }
}

function isTouchedPhase(phase: HybridControlPhase, projectStatus: string, hasExplicitControl: boolean) {
  if (!hasExplicitControl) return false
  return phase.status !== 'planned'
    || phase.phaseKey === projectStatus
    || phase.percent > 0
    || Boolean(phase.startDate || phase.endDate || phase.factEndDate)
}

function createGateScope(project: ProjectApprovalsRow, phase: HybridControlPhase, gate: HybridControlGate) {
  const href = `${clientSectionUrl(project.slug, 'project_control')}&controlPhase=${encodeURIComponent(phase.id)}`
  return createScopeRef({
    type: 'gate',
    id: `gate:${gate.id}`,
    title: `${phase.title}: ${gate.label}`,
    href,
  })
}

function collectGateApprovals(project: ProjectApprovalsRow) {
  const pending: ApiV1ClientPendingApproval[] = []
  const history: ApiV1ClientApprovalHistoryItem[] = []
  const rawControl = project.profile?.hybridControl
  const hasExplicitControl = Boolean(rawControl && typeof rawControl === 'object')
  const explicitPhaseKeys = new Set<string>()
  const explicitGateKeys = new Set<string>()

  if (hasExplicitControl) {
    const rawPhases = Array.isArray((rawControl as { phases?: unknown }).phases)
      ? (rawControl as { phases: unknown[] }).phases
      : []

    for (const rawPhase of rawPhases) {
      if (!rawPhase || typeof rawPhase !== 'object') continue
      const phase = rawPhase as Record<string, unknown>
      const phaseId = safeString(phase.id, 120)
      const phaseKey = safeString(phase.phaseKey, 120)
      if (phaseId) explicitPhaseKeys.add(phaseId)
      if (phaseKey) explicitPhaseKeys.add(phaseKey)

      const gates = Array.isArray(phase.gates) ? phase.gates : []
      for (const rawGate of gates) {
        if (!rawGate || typeof rawGate !== 'object') continue
        const gate = rawGate as Record<string, unknown>
        const gateId = safeString(gate.id, 120)
        const gateLabel = safeString(gate.label, 240)
        if (gateId) {
          if (phaseId) explicitGateKeys.add(`${phaseId}:${gateId}`)
          if (phaseKey) explicitGateKeys.add(`${phaseKey}:${gateId}`)
        }
        if (gateLabel) {
          if (phaseId) explicitGateKeys.add(`${phaseId}:${gateLabel}`)
          if (phaseKey) explicitGateKeys.add(`${phaseKey}:${gateLabel}`)
        }
      }
    }
  }

  const control = ensureHybridControl(project.profile?.hybridControl, project)
  const sourceUrl = clientSectionUrl(project.slug, 'project_control')

  for (const phase of control.phases || []) {
    if (!explicitPhaseKeys.has(phase.id) && !explicitPhaseKeys.has(phase.phaseKey)) continue
    if (!isTouchedPhase(phase, project.status, hasExplicitControl)) continue

    for (const gate of phase.gates || []) {
      const explicitGate = explicitGateKeys.has(`${phase.id}:${gate.id}`)
        || explicitGateKeys.has(`${phase.phaseKey}:${gate.id}`)
        || explicitGateKeys.has(`${phase.id}:${gate.label}`)
        || explicitGateKeys.has(`${phase.phaseKey}:${gate.label}`)
      if (!explicitGate) continue
      if (!isApprovalText(gate.label, phase.title)) continue

      const scopeRef = createGateScope(project, phase, gate)
      if (gate.done) {
        history.push(createHistory({
          id: `gate:${gate.id}:approved`,
          kind: 'gate',
          title: gate.label,
          summary: phase.title,
          scopeRef,
          decision: 'approved',
          decidedAt: phase.factEndDate || phase.endDate || project.updatedAt || '',
          sourceUrl,
          sourceLabel: 'Контроль проекта',
        }))
      } else if (phase.status === 'active' || phase.status === 'blocked' || phase.percent > 0) {
        pending.push(createPending({
          id: `gate:${gate.id}:pending`,
          kind: 'gate',
          title: gate.label,
          summary: phase.deliverable || phase.title,
          scopeRef,
          requestedAt: phase.startDate || project.updatedAt || '',
          dueDate: phase.endDate || '',
          blocking: phase.status === 'blocked' || phase.percent >= 80,
          awaiting: 'client',
          sourceUrl,
          sourceLabel: 'Контроль проекта',
          options: actionOptions('open', 'approve', 'request_changes'),
        }))
      }
    }
  }

  return { pending, history }
}

function collectProfileContractApproval(project: ProjectApprovalsRow) {
  const pending: ApiV1ClientPendingApproval[] = []
  const history: ApiV1ClientApprovalHistoryItem[] = []
  const profile = project.profile || {}
  const status = safeString(profile.contract_status, 120)
  const sourceUrl = clientSectionUrl(project.slug, 'contracts')
  const title = 'Договор дизайн-проекта'
  const scopeRef = createScopeRef({
    type: 'document',
    id: 'profile:contract',
    title,
    href: sourceUrl,
  })

  if (!status) return { pending, history }

  if (status === 'sent') {
    pending.push(createPending({
      id: 'profile:contract:sent',
      kind: 'document',
      title,
      summary: safeString(profile.contract_number, 240),
      scopeRef,
      requestedAt: safeDate(profile.contract_date) || safeDate(project.updatedAt),
      awaiting: 'client',
      sourceUrl,
      sourceLabel: 'Документы',
      options: actionOptions('open'),
    }))
  } else if (status === 'draft') {
    pending.push(createPending({
      id: 'profile:contract:draft',
      kind: 'document',
      title,
      summary: 'Документ готовится студией.',
      scopeRef,
      requestedAt: safeDate(project.updatedAt),
      awaiting: 'studio',
      sourceUrl,
      sourceLabel: 'Документы',
    }))
  } else if (status === 'signed') {
    history.push(createHistory({
      id: 'profile:contract:signed',
      kind: 'document',
      title,
      summary: safeString(profile.contract_number, 240),
      scopeRef,
      decision: 'approved',
      decidedBy: { role: 'client', displayName: 'Клиент' },
      decidedAt: safeDate(profile.contract_date) || safeDate(project.updatedAt),
      revision: status,
      sourceUrl,
      sourceLabel: 'Документы',
    }))
  } else if (status === 'rejected' || status === 'cancelled') {
    history.push(createHistory({
      id: `profile:contract:${status}`,
      kind: 'document',
      title,
      summary: safeString(profile.contract_notes, 1000),
      scopeRef,
      decision: status === 'cancelled' ? 'cancelled' : 'rejected',
      decidedBy: { role: 'client', displayName: 'Клиент' },
      decidedAt: safeDate(project.updatedAt),
      revision: status,
      sourceUrl,
      sourceLabel: 'Документы',
    }))
  }

  return { pending, history }
}

function collectDocumentApprovals(project: ProjectApprovalsRow, documents: DocumentApprovalRow[]) {
  const pending: ApiV1ClientPendingApproval[] = []
  const sourceUrl = clientSectionUrl(project.slug, 'contracts')

  for (const document of documents) {
    if (!isApprovalText(document.category, document.title)) continue

    const title = safeString(document.title, 500) || 'Документ на согласование'
    pending.push(createPending({
      id: `document:${document.id}:approval`,
      kind: 'document',
      title,
      summary: safeString(document.category, 240),
      scopeRef: createScopeRef({
        type: 'document',
        id: `document:${document.id}`,
        title,
        href: sourceUrl,
      }),
      requestedAt: safeDate(document.createdAt),
      awaiting: document.url || document.filename ? 'client' : 'studio',
      sourceUrl: document.url || sourceUrl,
      sourceLabel: 'Документы',
      options: actionOptions('open'),
    }))
  }

  return pending
}

function formatPrice(value: number | null) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ''
  return `${value.toLocaleString('ru-RU')} ₽`
}

function extraServiceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    requested: 'запрошено',
    quoted: 'ожидает согласования',
    approved: 'согласовано',
    contract_sent: 'договор отправлен',
    paid: 'оплачено',
    in_progress: 'в работе',
    done: 'завершено',
    rejected: 'отклонено',
    cancelled: 'отменено',
  }
  return labels[status] || status
}

function collectExtraServiceApprovals(project: ProjectApprovalsRow, services: ExtraServiceApprovalRow[]) {
  const pending: ApiV1ClientPendingApproval[] = []
  const history: ApiV1ClientApprovalHistoryItem[] = []
  const sourceUrl = clientSectionUrl(project.slug, 'extra_services')

  for (const service of services) {
    const status = safeString(service.status, 120) || 'requested'
    const title = safeString(service.title, 500) || 'Дополнительная услуга'
    const price = formatPrice(service.totalPrice)
    const summary = [safeString(service.description, 800), price].filter(Boolean).join(' · ')
    const scopeRef = createScopeRef({
      type: 'extra_service',
      id: `extra_service:${service.id}`,
      title,
      href: sourceUrl,
    })

    if (status === 'quoted') {
      pending.push(createPending({
        id: `extra_service:${service.id}:quoted`,
        kind: 'extra_service',
        title,
        summary,
        scopeRef,
        requestedAt: safeDate(service.updatedAt || service.createdAt),
        awaiting: 'client',
        sourceUrl,
        sourceLabel: 'Доп. услуги',
        options: actionOptions('open', 'approve', 'reject'),
      }))
    } else if (status === 'requested') {
      pending.push(createPending({
        id: `extra_service:${service.id}:requested`,
        kind: 'extra_service',
        title,
        summary: 'Запрос принят и ожидает ответа студии.',
        scopeRef,
        requestedAt: safeDate(service.createdAt),
        awaiting: 'studio',
        sourceUrl,
        sourceLabel: 'Доп. услуги',
      }))
    } else if (status === 'contract_sent') {
      pending.push(createPending({
        id: `extra_service:${service.id}:contract_sent`,
        kind: 'extra_service',
        title,
        summary,
        scopeRef,
        requestedAt: safeDate(service.updatedAt || service.createdAt),
        awaiting: 'client',
        sourceUrl,
        sourceLabel: 'Доп. услуги',
        options: actionOptions('open'),
      }))
    } else if (status === 'approved' || status === 'paid' || status === 'in_progress' || status === 'done') {
      history.push(createHistory({
        id: `extra_service:${service.id}:${status}`,
        kind: 'extra_service',
        title,
        summary,
        scopeRef,
        decision: 'approved',
        decidedBy: { role: 'client', displayName: 'Клиент' },
        decidedAt: safeDate(service.updatedAt || service.createdAt),
        comment: safeString(service.clientNotes, 1000),
        revision: status,
        sourceUrl,
        sourceLabel: extraServiceStatusLabel(status),
      }))
    } else if (status === 'rejected' || status === 'cancelled') {
      history.push(createHistory({
        id: `extra_service:${service.id}:${status}`,
        kind: 'extra_service',
        title,
        summary,
        scopeRef,
        decision: status === 'cancelled' ? 'cancelled' : 'rejected',
        decidedBy: { role: 'client', displayName: 'Клиент' },
        decidedAt: safeDate(service.updatedAt || service.createdAt),
        comment: safeString(service.clientNotes, 1000),
        revision: status,
        sourceUrl,
        sourceLabel: extraServiceStatusLabel(status),
      }))
    }
  }

  return { pending, history }
}

function createCallActor(insight: HybridControlCallInsight): ApiV1ClientApprovalActor {
  if (insight.actorRole === 'client') {
    return {
      role: 'client',
      displayName: safeString(insight.actorName, 120) || 'Клиент',
    }
  }

  return {
    role: 'studio',
    displayName: insight.actorRole === 'contractor' ? 'Команда проекта' : 'Студия',
  }
}

function collectCallInsightApprovals(project: ProjectApprovalsRow) {
  const pending: ApiV1ClientPendingApproval[] = []
  const history: ApiV1ClientApprovalHistoryItem[] = []
  const control = ensureHybridControl(project.profile?.hybridControl, project)
  const sourceUrl = clientSectionUrl(project.slug, 'communications')

  for (const insight of control.callInsights || []) {
    const insightTitle = safeString(insight.title, 500) || 'Коммуникация'
    const decidedAt = safeDate(insight.happenedAt || insight.createdAt)
    const scopeRef = createScopeRef({
      type: 'call_insight',
      id: `call_insight:${insight.id}`,
      title: insightTitle,
      href: sourceUrl,
    })

    insight.decisions.forEach((decisionText, index) => {
      const decision = normalizeDecision(decisionText)
      history.push(createHistory({
        id: `call_insight:${insight.id}:decision:${index + 1}`,
        kind: 'call_decision',
        title: safeString(decisionText, 500) || insightTitle,
        summary: insightTitle,
        scopeRef,
        decision,
        decidedBy: createCallActor(insight),
        decidedAt,
        comment: safeString(insight.summary, 1200),
        revision: insight.appliedAt || insight.createdAt,
        sourceUrl,
        sourceLabel: 'Коммуникации',
      }))
    })

    insight.approvals.forEach((approvalText, index) => {
      const decision = normalizeDecision(approvalText)
      if (decision === 'approved' || decision === 'rejected' || decision === 'changes_requested') {
        history.push(createHistory({
          id: `call_insight:${insight.id}:approval:${index + 1}`,
          kind: 'call_decision',
          title: safeString(approvalText, 500) || insightTitle,
          summary: insightTitle,
          scopeRef,
          decision,
          decidedBy: createCallActor(insight),
          decidedAt,
          comment: safeString(insight.summary, 1200),
          revision: insight.appliedAt || insight.createdAt,
          sourceUrl,
          sourceLabel: 'Коммуникации',
        }))
        return
      }

      pending.push(createPending({
        id: `call_insight:${insight.id}:approval:${index + 1}`,
        kind: 'call_decision',
        title: safeString(approvalText, 500) || 'Нужно согласование',
        summary: insightTitle,
        scopeRef,
        requestedAt: decidedAt,
        awaiting: 'client',
        sourceUrl,
        sourceLabel: 'Коммуникации',
        options: actionOptions('open'),
      }))
    })
  }

  return { pending, history }
}

function normalizeApprovalText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\p{N}\s:-]/gu, '')
    .trim()
}

function createApprovalDedupeKey(item: ApiV1ClientPendingApproval | ApiV1ClientApprovalHistoryItem) {
  const haystack = normalizeApprovalText(`${item.title} ${item.summary} ${item.scopeRef.title}`)
  if (/договор|contract/.test(haystack)) return 'document:contract'
  if (/сч[её]т|invoice|payment/.test(haystack)) return 'document:invoice'
  if (/мудборд|moodboard/.test(haystack)) return 'design:moodboard'
  if (/планиров|layout/.test(haystack)) return 'design:layout'
  if (/концепц|concept/.test(haystack)) return 'design:concept'
  if (/альбом|album/.test(haystack)) return 'design:album'
  if (/акт|при[её]мк|signoff|sign-off/.test(haystack)) return 'commissioning:signoff'
  return `${item.kind}:${item.scopeRef.type}:${item.scopeRef.id || haystack || item.id}`
}

function approvalSourcePriority(item: ApiV1ClientPendingApproval | ApiV1ClientApprovalHistoryItem) {
  if (item.kind === 'document') return 40
  if (item.kind === 'extra_service') return 30
  if (item.kind === 'gate') return 20
  return 10
}

function dedupeClientApprovals<T extends ApiV1ClientPendingApproval | ApiV1ClientApprovalHistoryItem>(items: T[]) {
  const byKey = new Map<string, T>()

  for (const item of items) {
    if (!item.id) continue
    const key = createApprovalDedupeKey(item)
    const current = byKey.get(key)
    if (!current) {
      byKey.set(key, item)
      continue
    }

    const itemPriority = approvalSourcePriority(item)
    const currentPriority = approvalSourcePriority(current)
    if (itemPriority > currentPriority) {
      byKey.set(key, item)
    }
  }

  return Array.from(byKey.values())
}

function sortPending(items: ApiV1ClientPendingApproval[]) {
  return [...items].sort((left, right) => {
    const leftOverdue = isPastDate(left.dueDate) ? 1 : 0
    const rightOverdue = isPastDate(right.dueDate) ? 1 : 0
    if (leftOverdue !== rightOverdue) return rightOverdue - leftOverdue
    if (left.awaiting !== right.awaiting) return left.awaiting === 'client' ? -1 : 1
    return (left.dueDate || left.requestedAt).localeCompare(right.dueDate || right.requestedAt)
  })
}

function sortHistory(items: ApiV1ClientApprovalHistoryItem[]) {
  return [...items].sort((left, right) => right.decidedAt.localeCompare(left.decidedAt))
}

export function createApiV1ClientProjectApprovalsDto(
  project: ProjectApprovalsRow,
  documents: DocumentApprovalRow[],
  services: ExtraServiceApprovalRow[],
): ApiV1ClientProjectApprovals {
  const gateApprovals = collectGateApprovals(project)
  const contractApproval = collectProfileContractApproval(project)
  const extraServiceApprovals = collectExtraServiceApprovals(project, services)
  const callInsightApprovals = collectCallInsightApprovals(project)

  const pending = sortPending(dedupeClientApprovals([
    ...gateApprovals.pending,
    ...contractApproval.pending,
    ...collectDocumentApprovals(project, documents),
    ...extraServiceApprovals.pending,
    ...callInsightApprovals.pending,
  ]))
  const history = sortHistory(dedupeClientApprovals([
    ...gateApprovals.history,
    ...contractApproval.history,
    ...extraServiceApprovals.history,
    ...callInsightApprovals.history,
  ]))
  const lastDecisionAt = history.find(item => item.decidedAt)?.decidedAt || ''

  return {
    project: createProjectRef(project),
    summary: {
      total: pending.length + history.length,
      pendingCount: pending.length,
      overdueCount: pending.filter(item => isPastDate(item.dueDate)).length,
      awaitingClient: pending.filter(item => item.awaiting === 'client').length,
      awaitingStudio: pending.filter(item => item.awaiting === 'studio').length,
      approvedCount: history.filter(item => item.decision === 'approved').length,
      changesRequestedCount: history.filter(item => item.decision === 'changes_requested').length,
      rejectedCount: history.filter(item => item.decision === 'rejected' || item.decision === 'cancelled').length,
      lastDecisionAt,
    },
    pending,
    history,
  }
}
