export const SYSTEM_STATUS_COLORS = {
  planned: 'neutral',
  active: 'info',
  review: 'warning',
  done: 'success',
  blocked: 'danger',
  stable: 'success',
  warning: 'warning',
  critical: 'danger',
  draft: 'neutral',
  archived: 'muted',
} as const

export type SystemStatusColorKey = keyof typeof SYSTEM_STATUS_COLORS
export type SystemStatusColorValue = (typeof SYSTEM_STATUS_COLORS)[SystemStatusColorKey]
