/**
 * shared/utils/work-status.ts
 * Единый источник истины для статусов задач (work status items).
 * Аналог roadmap.ts — все метки, CSS-классы, иконки определены здесь.
 */

import { CONTRACTOR_WORK_TYPE_OPTIONS } from '~~/shared/types/catalogs'

// ── Канонические статусы задач ─────────────────────────────────

export type CanonicalWorkStatus = 'pending' | 'in_progress' | 'done' | 'skipped' | 'paused' | 'cancelled' | 'planned'

const WORK_STATUS_ALIASES: Record<string, CanonicalWorkStatus> = {
  pending: 'pending',
  wait: 'pending',
  waiting: 'pending',
  ожидание: 'pending',
  ожидает: 'pending',

  planned: 'planned',
  запланировано: 'planned',
  plan: 'planned',

  in_progress: 'in_progress',
  'in-progress': 'in_progress',
  inprogress: 'in_progress',
  active: 'in_progress',
  working: 'in_progress',
  'в работе': 'in_progress',
  'в_работе': 'in_progress',

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
  in_progress: 'в работе',
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
  in_progress: '◉',
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
  in_progress: 'ws-status--progress',
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
