/**
 * Shared select-option lists used across the project-control sections
 * (Admin & Client variants). Keep this file pure data + pure label
 * lookups — no reactive state, so it can be imported from any section
 * component without triggering Vue setup effects.
 */

import {
  getHybridCommunicationChannelLabel,
  getHybridStakeholderRoleLabel,
} from '~~/shared/utils/project-control'
import type {
  HybridControlCommunicationChannel,
  HybridControlStakeholderRole,
} from '~~/shared/types/project'

export const phaseStatusOptions = [
  { value: 'planned', label: 'запланирована' },
  { value: 'active', label: 'в работе' },
  { value: 'blocked', label: 'заблокирована' },
  { value: 'done', label: 'завершена' },
] as const

export const sprintStatusOptions = [
  { value: 'planned', label: 'запланирован' },
  { value: 'active', label: 'активен' },
  { value: 'review', label: 'на ревью' },
  { value: 'done', label: 'завершён' },
] as const

export const checkpointStatusOptions = [
  { value: 'stable', label: 'стабильно' },
  { value: 'warning', label: 'внимание' },
  { value: 'critical', label: 'критично' },
] as const

export const taskStatusOptions = [
  { value: 'todo', label: 'к запуску' },
  { value: 'doing', label: 'в работе' },
  { value: 'review', label: 'на ревью' },
  { value: 'done', label: 'готово' },
] as const

export const phaseStatusLabels = Object.fromEntries(
  phaseStatusOptions.map(option => [option.value, option.label]),
) as Record<(typeof phaseStatusOptions)[number]['value'], string>

export const sprintStatusLabels = Object.fromEntries(
  sprintStatusOptions.map(option => [option.value, option.label]),
) as Record<(typeof sprintStatusOptions)[number]['value'], string>

export const checkpointStatusLabels = Object.fromEntries(
  checkpointStatusOptions.map(option => [option.value, option.label]),
) as Record<(typeof checkpointStatusOptions)[number]['value'], string>

export const taskStatusLabels = Object.fromEntries(
  taskStatusOptions.map(option => [option.value, option.label]),
) as Record<(typeof taskStatusOptions)[number]['value'], string>

export const communicationChannelOptions = (
  ['project-room', 'direct-thread', 'handoff', 'approval', 'daily-digest'] as const satisfies readonly HybridControlCommunicationChannel[]
).map(value => ({
  value,
  label: getHybridCommunicationChannelLabel(value),
}))

export const stakeholderRoleOptions = (
  ['admin', 'manager', 'designer', 'client', 'contractor', 'seller', 'service'] as const satisfies readonly HybridControlStakeholderRole[]
).map(value => ({
  value,
  label: getHybridStakeholderRoleLabel(value),
}))
