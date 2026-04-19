/**
 * Shared select-option lists used across the project-control sections
 * (Admin & Client variants). Keep this file pure data + pure label
 * lookups — no reactive state, so it can be imported from any section
 * component without triggering Vue setup effects.
 */


export const phaseStatusOptions = [
  { value: 'planned', label: 'запланирована' },
  { value: 'active', label: 'в работе' },
  { value: 'blocked', label: 'заблокирована' },
  { value: 'done', label: 'завершена' },
] as const

export const checkpointStatusOptions = [
  { value: 'stable', label: 'стабильно' },
  { value: 'warning', label: 'внимание' },
  { value: 'critical', label: 'критично' },
] as const

export const phaseStatusLabels = Object.fromEntries(
  phaseStatusOptions.map(option => [option.value, option.label]),
) as Record<(typeof phaseStatusOptions)[number]['value'], string>

export const sprintStatusLabels: Record<string, string> = {
  planned: 'запланирован',
  active: 'активен',
  review: 'на ревью',
  done: 'завершён',
}

export const checkpointStatusLabels = Object.fromEntries(
  checkpointStatusOptions.map(option => [option.value, option.label]),
) as Record<(typeof checkpointStatusOptions)[number]['value'], string>
