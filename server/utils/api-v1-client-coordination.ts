import type {
  ProjectGovernanceDetailItem,
  ProjectScopeDetailBundle,
  ProjectScopeLink,
  ProjectScopeParticipantSummary,
  ProjectScopeRuleSummary,
  ProjectScopeSource,
  ProjectScopeTaskSummary,
  ProjectScopeType,
} from '~/shared/types/project/project-governance'
import {
  buildProjectScopeSettingEntries,
  filterProjectScopeSettingsForEditor,
  getProjectScopeEditableSettingKeys,
} from '~/shared/utils/project/project-governance'
import type { ApiV1ClientProjectScopeSettingsUpdate } from '~/shared/types/api-v1'

type ClientSafeSettingValue = string | number | boolean | null

type ScopeSettingsUpdateResult = {
  revision: string
  scope: {
    scopeType: ProjectScopeType
    scopeSource: ProjectScopeSource
    scopeId: string
  }
  scopeSettings?: {
    settings?: Record<string, unknown> | null
  } | null
}

const SCOPE_TYPES_WITH_PRIVATE_SUBTITLE = new Set<ProjectScopeType>(['document', 'service'])

const SENSITIVE_TEXT_TOKENS = [
  'admin',
  'bank',
  'budget',
  'cost',
  'email',
  'internal',
  'legacy',
  'messenger',
  'note',
  'passport',
  'phone',
  'price',
  'raw',
  'secret',
  'template',
  'token',
  'totalprice',
  'внутрен',
  'замет',
  'комментар',
  'паспорт',
  'почт',
  'служеб',
  'стоим',
  'телефон',
  'шаблон',
]

function safeString(value: unknown, maxLength = 500) {
  if (value === null || value === undefined) return ''
  return String(value).trim().slice(0, maxLength)
}

function containsSensitiveText(value: unknown) {
  const text = safeString(value, 2000).toLowerCase()
  if (!text) return false
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(text)) return true
  if (/[₽$€]|руб\.?|eur|usd/.test(text)) return true

  const compact = text.replace(/[\s._:-]+/g, '')
  return SENSITIVE_TEXT_TOKENS.some(token => compact.includes(token))
}

function sanitizeSettingValue(value: unknown): ClientSafeSettingValue {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') {
    const normalized = safeString(value, 500)
    return containsSensitiveText(normalized) ? '' : normalized
  }
  return null
}

function sanitizeDetailItem(item: ProjectGovernanceDetailItem): ProjectGovernanceDetailItem | null {
  if (
    containsSensitiveText(item.key)
    || containsSensitiveText(item.label)
    || containsSensitiveText(item.value)
  ) {
    return null
  }

  const key = safeString(item.key, 160)
  const label = safeString(item.label, 160)
  const value = safeString(item.value, 1000)
  if (!key || !label || !value) return null

  return { key, label, value }
}

function sanitizeDetailItems(items: ProjectGovernanceDetailItem[]) {
  return items
    .map(item => sanitizeDetailItem(item))
    .filter(Boolean) as ProjectGovernanceDetailItem[]
}

function sanitizeParticipant(participant: ProjectScopeParticipantSummary): ProjectScopeParticipantSummary | null {
  if (containsSensitiveText(participant.displayName)) return null

  const secondary = containsSensitiveText(participant.secondary)
    ? ''
    : safeString(participant.secondary, 240)

  return {
    assignmentId: safeString(participant.assignmentId, 160),
    participantId: safeString(participant.participantId, 160),
    displayName: safeString(participant.displayName, 160),
    roleKey: participant.roleKey,
    roleLabel: safeString(participant.roleLabel, 120) || 'Участник',
    responsibility: participant.responsibility,
    responsibilityLabel: safeString(participant.responsibilityLabel, 120) || 'Участник',
    origin: participant.origin,
    activeTaskCount: Math.max(0, Number(participant.activeTaskCount) || 0),
    secondary,
  }
}

function sanitizeLinkedScope(scope: ProjectScopeLink): ProjectScopeLink | null {
  if (containsSensitiveText(scope.title) || containsSensitiveText(scope.statusLabel) || containsSensitiveText(scope.status)) {
    return null
  }

  return {
    scopeType: scope.scopeType,
    scopeSource: scope.scopeSource,
    scopeId: safeString(scope.scopeId, 255),
    title: safeString(scope.title, 240),
    status: safeString(scope.status, 120) || undefined,
    statusLabel: safeString(scope.statusLabel, 160) || undefined,
  }
}

function sanitizeTask(task: ProjectScopeTaskSummary): ProjectScopeTaskSummary | null {
  if (containsSensitiveText(task.title) || containsSensitiveText(task.status) || containsSensitiveText(task.statusLabel)) {
    return null
  }

  const assigneeLabels = task.assigneeLabels
    .map(label => safeString(label, 160))
    .filter(label => label && !containsSensitiveText(label))

  return {
    id: safeString(task.id, 255),
    title: safeString(task.title, 240),
    status: safeString(task.status, 120) || 'pending',
    statusLabel: safeString(task.statusLabel, 160) || 'В работе',
    assigneeLabels,
    secondary: containsSensitiveText(task.secondary) ? '' : safeString(task.secondary, 240),
  }
}

function sanitizeRule(rule: ProjectScopeRuleSummary): ProjectScopeRuleSummary | null {
  if (
    containsSensitiveText(rule.title)
    || containsSensitiveText(rule.channel)
    || containsSensitiveText(rule.trigger)
    || containsSensitiveText(rule.audience)
  ) {
    return null
  }

  return {
    id: safeString(rule.id, 160),
    title: safeString(rule.title, 240),
    channel: safeString(rule.channel, 160),
    trigger: safeString(rule.trigger, 240),
    audience: safeString(rule.audience, 240),
  }
}

function sanitizeScopeSubtitle(detail: ProjectScopeDetailBundle) {
  if (SCOPE_TYPES_WITH_PRIVATE_SUBTITLE.has(detail.scope.scopeType)) {
    return ''
  }

  const subtitle = safeString(detail.scope.subtitle, 300)
  return containsSensitiveText(subtitle) ? '' : subtitle
}

export function createApiV1ClientScopeSettings(
  scopeType: ProjectScopeType,
  settings?: Record<string, unknown> | null,
): Record<string, ClientSafeSettingValue> {
  const allowedKeys = new Set(getProjectScopeEditableSettingKeys(scopeType, 'client'))
  const filtered = filterProjectScopeSettingsForEditor(scopeType, settings, 'client')
  const safeSettings: Record<string, ClientSafeSettingValue> = {}

  for (const key of allowedKeys) {
    if (!(key in filtered)) continue
    safeSettings[key] = sanitizeSettingValue(filtered[key])
  }

  return safeSettings
}

export function createApiV1ClientProjectScopeDetailDto(
  detail: ProjectScopeDetailBundle,
): ProjectScopeDetailBundle {
  const settings = createApiV1ClientScopeSettings(detail.scope.scopeType, detail.settings)
  const allowedSettingKeys = new Set(getProjectScopeEditableSettingKeys(detail.scope.scopeType, 'client'))
  const settingItems = buildProjectScopeSettingEntries(detail.scope.scopeType, settings)
    .filter(item => allowedSettingKeys.has(item.key))

  return {
    revision: safeString(detail.revision, 120) || 'v1',
    scope: {
      scopeType: detail.scope.scopeType,
      scopeSource: detail.scope.scopeSource,
      scopeId: safeString(detail.scope.scopeId, 255),
      title: safeString(detail.scope.title, 240) || 'Контур проекта',
      subtitle: sanitizeScopeSubtitle(detail),
      status: containsSensitiveText(detail.scope.status) ? '' : safeString(detail.scope.status, 120),
      statusLabel: containsSensitiveText(detail.scope.statusLabel) ? '' : safeString(detail.scope.statusLabel, 160),
    },
    core: {},
    settings,
    settingItems: sanitizeDetailItems(settingItems),
    participants: detail.participants
      .map(participant => sanitizeParticipant(participant))
      .filter(Boolean) as ProjectScopeParticipantSummary[],
    subjectItems: sanitizeDetailItems(detail.subjectItems),
    objectItems: sanitizeDetailItems(detail.objectItems),
    actionItems: sanitizeDetailItems(detail.actionItems),
    ruleItems: detail.ruleItems
      .map(rule => sanitizeRule(rule))
      .filter(Boolean) as ProjectScopeRuleSummary[],
    linkedScopes: detail.linkedScopes
      .map(scope => sanitizeLinkedScope(scope))
      .filter(Boolean) as ProjectScopeLink[],
    tasks: detail.tasks
      .map(task => sanitizeTask(task))
      .filter(Boolean) as ProjectScopeTaskSummary[],
  }
}

export function createApiV1ClientProjectScopeSettingsUpdateDto(
  result: ScopeSettingsUpdateResult,
): ApiV1ClientProjectScopeSettingsUpdate {
  return {
    ok: true,
    revision: safeString(result.revision, 120) || 'v1',
    scope: {
      scopeType: result.scope.scopeType,
      scopeSource: result.scope.scopeSource,
      scopeId: safeString(result.scope.scopeId, 255),
    },
    settings: createApiV1ClientScopeSettings(result.scope.scopeType, result.scopeSettings?.settings || {}),
  }
}
