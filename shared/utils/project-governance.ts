import type {
  ProjectGovernanceDetailItem,
  ProjectParticipantRoleKey,
  ProjectParticipantSourceKind,
  ProjectResponsibilityKey,
  ProjectScopeSource,
  ProjectScopeType,
} from '../types/project-governance'

const PARTICIPANT_ROLE_LABELS: Record<ProjectParticipantRoleKey, string> = {
  client: 'Клиент',
  manager: 'Менеджер',
  designer: 'Дизайнер',
  lawyer: 'Юрист',
  contractor: 'Подрядчик',
  seller: 'Поставщик',
  engineer: 'Инженер',
  consultant: 'Консультант',
  service: 'Сервис',
  other: 'Участник',
}

const PARTICIPANT_SOURCE_LABELS: Record<ProjectParticipantSourceKind, string> = {
  client: 'Клиент',
  contractor: 'Подрядчик',
  designer: 'Дизайнер',
  seller: 'Поставщик',
  manager: 'Менеджер',
  custom: 'Кастомный участник',
}

const RESPONSIBILITY_LABELS: Record<ProjectResponsibilityKey, string> = {
  lead: 'Ведёт контур',
  owner: 'Владелец',
  executor: 'Исполнитель',
  reviewer: 'Проверяет',
  approver: 'Согласует',
  observer: 'Подключён',
  consultant: 'Консультирует',
}

const SCOPE_TYPE_LABELS: Record<ProjectScopeType, string> = {
  project: 'Проект',
  phase: 'Фаза',
  sprint: 'Спринт',
  task: 'Задача',
  document: 'Документ',
  service: 'Услуга',
}

const SCOPE_DEFAULT_SETTINGS: Record<ProjectScopeType, Record<string, unknown>> = {
  project: {
    communicationChannel: 'project-room',
    approvalMode: 'project-lead',
    visibility: 'team',
    reminderCadenceDays: 3,
    requiredResponsibilities: ['lead', 'owner', 'observer'],
  },
  phase: {
    communicationChannel: 'project-room',
    approvalMode: 'phase-owner',
    visibility: 'team',
    reminderCadenceDays: 2,
    requiredResponsibilities: ['owner', 'executor', 'reviewer'],
    escalateOnBlocked: true,
  },
  sprint: {
    communicationChannel: 'handoff',
    approvalMode: 'sprint-review',
    visibility: 'team',
    reviewCadenceDays: 7,
    requiredResponsibilities: ['owner', 'executor'],
    definitionOfDone: 'Все задачи спринта переведены в done или review.',
  },
  task: {
    communicationChannel: 'direct-thread',
    approvalMode: 'task-review',
    visibility: 'assigned-only',
    reminderCadenceDays: 1,
    requiredResponsibilities: ['executor', 'reviewer'],
    acceptanceMode: 'explicit',
  },
  document: {
    communicationChannel: 'approval',
    approvalMode: 'document-approval',
    visibility: 'team',
    requiredResponsibilities: ['owner', 'approver'],
  },
  service: {
    communicationChannel: 'project-room',
    approvalMode: 'service-request',
    visibility: 'team',
    ownerRole: 'manager',
    slaHours: 48,
  },
}

const SCOPE_SETTING_LABELS: Record<string, string> = {
  communicationChannel: 'Канал коммуникации',
  approvalMode: 'Режим согласования',
  visibility: 'Видимость',
  reminderCadenceDays: 'Ритм напоминаний, дней',
  requiredResponsibilities: 'Обязательные роли',
  escalateOnBlocked: 'Эскалация блокера',
  reviewCadenceDays: 'Ревью, дней',
  definitionOfDone: 'Definition of Done',
  acceptanceMode: 'Режим приёмки',
  ownerRole: 'Ведущая роль',
  slaHours: 'SLA, часов',
}

const SCOPE_SETTING_ORDER: Record<ProjectScopeType, string[]> = {
  project: ['communicationChannel', 'approvalMode', 'visibility', 'reminderCadenceDays', 'requiredResponsibilities'],
  phase: ['communicationChannel', 'approvalMode', 'visibility', 'reminderCadenceDays', 'requiredResponsibilities', 'escalateOnBlocked'],
  sprint: ['communicationChannel', 'approvalMode', 'visibility', 'reviewCadenceDays', 'requiredResponsibilities', 'definitionOfDone'],
  task: ['communicationChannel', 'approvalMode', 'visibility', 'reminderCadenceDays', 'requiredResponsibilities', 'acceptanceMode'],
  document: ['communicationChannel', 'approvalMode', 'visibility', 'requiredResponsibilities'],
  service: ['communicationChannel', 'approvalMode', 'visibility', 'ownerRole', 'slaHours'],
}

const CLIENT_EDITABLE_SETTING_KEYS: Record<ProjectScopeType, string[]> = {
  project: ['approvalMode', 'visibility', 'reminderCadenceDays'],
  phase: ['approvalMode', 'visibility', 'reminderCadenceDays'],
  sprint: ['approvalMode', 'visibility', 'reviewCadenceDays'],
  task: ['approvalMode', 'visibility', 'reminderCadenceDays', 'acceptanceMode'],
  document: ['approvalMode', 'visibility'],
  service: ['visibility'],
}

export type ProjectGovernanceEditorRole = 'admin' | 'client'

function cloneRecord(source: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(source)) as Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function uniqueKeys(keys: string[]) {
  return Array.from(new Set(keys))
}

export function getProjectParticipantRoleLabel(roleKey: ProjectParticipantRoleKey) {
  return PARTICIPANT_ROLE_LABELS[roleKey] || PARTICIPANT_ROLE_LABELS.other
}

export function getProjectParticipantSourceLabel(sourceKind: ProjectParticipantSourceKind) {
  return PARTICIPANT_SOURCE_LABELS[sourceKind] || PARTICIPANT_SOURCE_LABELS.custom
}

export function getProjectResponsibilityLabel(responsibility: ProjectResponsibilityKey) {
  return RESPONSIBILITY_LABELS[responsibility] || RESPONSIBILITY_LABELS.observer
}

export function getProjectScopeTypeLabel(scopeType: ProjectScopeType) {
  return SCOPE_TYPE_LABELS[scopeType] || SCOPE_TYPE_LABELS.project
}

export function buildProjectScopeRefKey(scopeType: ProjectScopeType, scopeSource: ProjectScopeSource, scopeId: string) {
  return `${scopeType}:${scopeSource}:${scopeId}`
}

export function buildDefaultProjectScopeSettings(scopeType: ProjectScopeType) {
  return cloneRecord(SCOPE_DEFAULT_SETTINGS[scopeType] || {})
}

export function getProjectScopeEditableSettingKeys(scopeType: ProjectScopeType, editorRole: ProjectGovernanceEditorRole = 'admin') {
  if (editorRole === 'admin') {
    return uniqueKeys([...(SCOPE_SETTING_ORDER[scopeType] || []), ...Object.keys(SCOPE_DEFAULT_SETTINGS[scopeType] || {})])
  }

  return uniqueKeys(CLIENT_EDITABLE_SETTING_KEYS[scopeType] || [])
}

export function filterProjectScopeSettingsForEditor(
  scopeType: ProjectScopeType,
  settings?: Record<string, unknown> | null,
  editorRole: ProjectGovernanceEditorRole = 'admin',
) {
  if (!isRecord(settings)) {
    return {}
  }

  if (editorRole === 'admin') {
    return cloneRecord(settings)
  }

  const allowedKeys = new Set(getProjectScopeEditableSettingKeys(scopeType, editorRole))
  const filtered: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(settings)) {
    if (!allowedKeys.has(key)) {
      continue
    }

    filtered[key] = cloneRecord({ value }).value
  }

  return filtered
}

export function normalizeProjectScopeSettings(scopeType: ProjectScopeType, settings?: Record<string, unknown> | null) {
  return {
    ...buildDefaultProjectScopeSettings(scopeType),
    ...(isRecord(settings) ? settings : {}),
  }
}

export function stringifyProjectScopeSettingValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(entry => stringifyProjectScopeSettingValue(entry)).filter(Boolean).join(', ')
  }

  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет'
  }

  if (typeof value === 'number') {
    return `${value}`
  }

  if (typeof value === 'string') {
    return value.trim()
  }

  if (isRecord(value)) {
    return Object.entries(value)
      .map(([key, entry]) => `${key}: ${stringifyProjectScopeSettingValue(entry)}`)
      .join(', ')
  }

  return ''
}

export function buildProjectScopeSettingEntries(scopeType: ProjectScopeType, settings?: Record<string, unknown> | null): ProjectGovernanceDetailItem[] {
  const normalized = normalizeProjectScopeSettings(scopeType, settings)
  const orderedKeys = [...SCOPE_SETTING_ORDER[scopeType]]

  Object.keys(normalized).forEach((key) => {
    if (!orderedKeys.includes(key)) {
      orderedKeys.push(key)
    }
  })

  return orderedKeys
    .map((key) => {
      const value = stringifyProjectScopeSettingValue(normalized[key])
      if (!value) {
        return null
      }

      return {
        key,
        label: SCOPE_SETTING_LABELS[key] || key,
        value,
      }
    })
    .filter(Boolean) as ProjectGovernanceDetailItem[]
}