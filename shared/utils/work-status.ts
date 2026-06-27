/**
 * shared/utils/work-status.ts
 * Единый источник истины для статусов задач (work status items).
 * Все метки, CSS-классы, иконки определены здесь.
 */

import { CONTRACTOR_WORK_TYPE_OPTIONS } from '~~/shared/types/catalogs'

// ── Канонические статусы задач ─────────────────────────────────

export type CanonicalWorkStatus =
  | 'pending'
  | 'planned'
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'ready_for_review'
  | 'blocked'
  | 'needs_fix'
  | 'done'
  | 'skipped'
  | 'paused'
  | 'cancelled'

const WORK_STATUS_ALIASES: Record<string, CanonicalWorkStatus> = {
  pending: 'pending',
  assigned: 'assigned',
  wait: 'pending',
  waiting: 'pending',
  ожидание: 'pending',
  ожидает: 'pending',
  назначено: 'assigned',
  назначена: 'assigned',

  planned: 'planned',
  запланировано: 'planned',
  plan: 'planned',

  accepted: 'accepted',
  принято: 'accepted',
  принята: 'accepted',

  in_progress: 'in_progress',
  'in-progress': 'in_progress',
  inprogress: 'in_progress',
  active: 'in_progress',
  working: 'in_progress',
  'в работе': 'in_progress',
  'в_работе': 'in_progress',

  ready_for_review: 'ready_for_review',
  ready: 'ready_for_review',
  review: 'ready_for_review',
  checking: 'ready_for_review',
  'на проверке': 'ready_for_review',
  'на_проверке': 'ready_for_review',

  blocked: 'blocked',
  block: 'blocked',
  заблокировано: 'blocked',
  блокер: 'blocked',

  needs_fix: 'needs_fix',
  needsfix: 'needs_fix',
  fix: 'needs_fix',
  'нужны правки': 'needs_fix',
  'нужны_правки': 'needs_fix',
  доработать: 'needs_fix',

  done: 'done',
  completed: 'done',
  finished: 'done',
  готово: 'done',
  выполнено: 'done',

  paused: 'paused',
  'на паузе': 'paused',

  cancelled: 'cancelled',
  canceled: 'cancelled',
  отменено: 'cancelled',

  skipped: 'skipped',
  пропущено: 'skipped',
}

export function normalizeWorkStatus(status?: string | null): CanonicalWorkStatus {
  const value = String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  return WORK_STATUS_ALIASES[value] || 'pending'
}

// ── Метки ──────────────────────────────────────────────────────

const STATUS_LABELS: Record<CanonicalWorkStatus, string> = {
  pending: 'ожидание',
  planned: 'запланировано',
  assigned: 'назначено',
  accepted: 'принято',
  in_progress: 'в работе',
  ready_for_review: 'на проверке',
  blocked: 'заблокировано',
  needs_fix: 'нужны правки',
  done: 'выполнено',
  paused: 'на паузе',
  cancelled: 'отменено',
  skipped: 'пропущено',
}

export function workStatusLabel(status?: string | null): string {
  return STATUS_LABELS[normalizeWorkStatus(status)] || 'ожидание'
}

// ── Иконки ─────────────────────────────────────────────────────

const STATUS_ICONS: Record<CanonicalWorkStatus, string> = {
  pending: '○',
  planned: '◎',
  assigned: '○',
  accepted: '◐',
  in_progress: '◉',
  ready_for_review: '◌',
  blocked: '!',
  needs_fix: '↻',
  done: '✓',
  paused: '⏸',
  cancelled: '✕',
  skipped: '—',
}

export function workStatusIcon(status?: string | null): string {
  return STATUS_ICONS[normalizeWorkStatus(status)] || '○'
}

// ── CSS-классы ─────────────────────────────────────────────────

const STATUS_CSS: Record<CanonicalWorkStatus, string> = {
  pending: 'ws-status--pending',
  planned: 'ws-status--planned',
  assigned: 'ws-status--assigned',
  accepted: 'ws-status--accepted',
  in_progress: 'ws-status--progress',
  ready_for_review: 'ws-status--review',
  blocked: 'ws-status--blocked',
  needs_fix: 'ws-status--fix',
  done: 'ws-status--done',
  paused: 'ws-status--paused',
  cancelled: 'ws-status--cancelled',
  skipped: 'ws-status--skipped',
}

export function workStatusCssClass(status?: string | null): string {
  return STATUS_CSS[normalizeWorkStatus(status)] || 'ws-status--pending'
}

// ── Перевод видов работ ────────────────────────────────────────

export function workTypeLabel(workType: string): string {
  return CONTRACTOR_WORK_TYPE_OPTIONS.find(o => o.value === workType)?.label ?? workType
}

// ── Счётчики ───────────────────────────────────────────────────

export function workDoneCount(items: Array<{ status?: string | null }>): number {
  return (items || []).filter(i => normalizeWorkStatus(i.status) === 'done').length
}

export function workOverdueCount(items: Array<{ status?: string | null; dateEnd?: string | null }>): number {
  const now = new Date().toISOString().slice(0, 10)
  return (items || []).filter(i => {
    const s = normalizeWorkStatus(i.status)
    return s !== 'done' && s !== 'cancelled' && s !== 'skipped' && i.dateEnd && i.dateEnd < now
  }).length
}
