import type { HybridControl, HybridControlPhase, HybridControlSprint } from '../types/project'

export type HybridTimelineTone = 'stable' | 'warning' | 'critical'
export type HybridTimelineScale = 'months' | 'weeks' | 'days' | 'hours'

export type HybridTimelineRow = {
  id: string
  type: 'phase' | 'sprint'
  typeLabel: string
  title: string
  meta: string
  tone: HybridTimelineTone
  statusLabel: string
  progressLabel: string
  startDate: string
  endDate: string
  phaseKey?: string
  linkedPhaseKey?: string
}

export type HybridTimelineBounds = {
  start: Date
  end: Date
}

export type HybridTimelineColumn = {
  key: string
  label: string
  rangeLabel: string
  start: Date
}

const TIMELINE_MIN_SPAN_MS: Record<HybridTimelineScale, number> = {
  months: 180 * 86400000,
  weeks: 69 * 86400000,
  days: 14 * 86400000,
  hours: 72 * 3600000,
}

const PHASE_STATUS_LABELS: Record<HybridControlPhase['status'], string> = {
  planned: 'запланирована',
  active: 'в работе',
  blocked: 'заблокирована',
  done: 'завершена',
}

const SPRINT_STATUS_LABELS: Record<HybridControlSprint['status'], string> = {
  planned: 'запланирован',
  active: 'активен',
  review: 'на ревью',
  done: 'завершён',
}

export function parseIsoDate(value?: string) {
  if (!value) return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

export function toIsoLocalDate(value: Date) {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addTimelineDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

export function addTimelineMonths(value: Date, months: number) {
  const next = new Date(value)
  next.setMonth(next.getMonth() + months)
  return next
}

export function addTimelineHours(value: Date, hours: number) {
  const next = new Date(value)
  next.setHours(next.getHours() + hours)
  return next
}

export function startOfTimelineDay(value: Date) {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  return next
}

export function endOfTimelineDay(value: Date) {
  const next = startOfTimelineDay(value)
  next.setHours(23, 59, 59, 999)
  return next
}

export function startOfTimelineMonth(value: Date) {
  const next = new Date(value)
  next.setDate(1)
  next.setHours(0, 0, 0, 0)
  return next
}

export function endOfTimelineMonth(value: Date) {
  const next = startOfTimelineMonth(value)
  next.setMonth(next.getMonth() + 1)
  next.setMilliseconds(-1)
  return next
}

export function startOfTimelineHour(value: Date) {
  const next = new Date(value)
  next.setMinutes(0, 0, 0)
  return next
}

export function endOfTimelineHour(value: Date) {
  const next = startOfTimelineHour(value)
  next.setHours(next.getHours() + 1)
  next.setMilliseconds(-1)
  return next
}

export function startOfTimelineWeek(value: Date) {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  const shift = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - shift)
  return next
}

export function endOfTimelineWeek(value: Date) {
  const next = addTimelineDays(startOfTimelineWeek(value), 6)
  next.setHours(23, 59, 59, 999)
  return next
}

export function diffTimelineDays(start: Date, end: Date) {
  return Math.round((end.getTime() - start.getTime()) / 86400000)
}

export function resolveHybridTimelineRowRange(row: Pick<HybridTimelineRow, 'type' | 'startDate' | 'endDate'>) {
  const defaultDays = row.type === 'phase' ? 20 : 13
  const rawStart = parseIsoDate(row.startDate)
  const rawEnd = parseIsoDate(row.endDate)

  if (rawStart && rawEnd && rawEnd.getTime() >= rawStart.getTime()) {
    return { start: rawStart, end: rawEnd }
  }

  if (rawStart) {
    return { start: rawStart, end: addTimelineDays(rawStart, defaultDays) }
  }

  if (rawEnd) {
    return { start: addTimelineDays(rawEnd, -defaultDays), end: rawEnd }
  }

  const fallbackStart = startOfTimelineWeek(new Date())
  return { start: fallbackStart, end: addTimelineDays(fallbackStart, defaultDays) }
}

export function getHybridTimelineScaleLabel(scale: HybridTimelineScale) {
  if (scale === 'months') return 'Месяцы'
  if (scale === 'days') return 'Дни'
  if (scale === 'hours') return 'Часы'
  return 'Недели'
}

export function getHybridTimelineColumnWidth(scale: HybridTimelineScale) {
  if (scale === 'months') return 132
  if (scale === 'days') return 44
  if (scale === 'hours') return 28
  return 92
}

export function startOfHybridTimelineScale(value: Date, scale: HybridTimelineScale) {
  if (scale === 'months') return startOfTimelineMonth(value)
  if (scale === 'days') return startOfTimelineDay(value)
  if (scale === 'hours') return startOfTimelineHour(value)
  return startOfTimelineWeek(value)
}

export function endOfHybridTimelineScale(value: Date, scale: HybridTimelineScale) {
  if (scale === 'months') return endOfTimelineMonth(value)
  if (scale === 'days') return endOfTimelineDay(value)
  if (scale === 'hours') return endOfTimelineHour(value)
  return endOfTimelineWeek(value)
}

export function advanceHybridTimelineScale(value: Date, scale: HybridTimelineScale, amount = 1) {
  if (scale === 'months') return addTimelineMonths(value, amount)
  if (scale === 'days') return addTimelineDays(value, amount)
  if (scale === 'hours') return addTimelineHours(value, amount)
  return addTimelineDays(value, amount * 7)
}

export function formatHybridTimelineDateRange(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return 'период не задан'
  if (startDate && endDate) return `${startDate} - ${endDate}`
  return startDate || endDate || 'период не задан'
}

export function buildHybridTimelineRows(control: HybridControl): HybridTimelineRow[] {
  const rows: HybridTimelineRow[] = []
  const linkedSprintKeys = new Set<string>()

  control.phases.forEach((phase) => {
    rows.push({
      id: phase.id,
      type: 'phase',
      typeLabel: 'Фаза',
      title: phase.title,
      meta: phase.owner || phase.deliverable || 'Фазовый контур',
      tone: phase.status === 'blocked' ? 'critical' : phase.status === 'active' ? 'warning' : 'stable',
      statusLabel: PHASE_STATUS_LABELS[phase.status],
      progressLabel: `${phase.percent || 0}%`,
      startDate: phase.startDate || '',
      endDate: phase.endDate || '',
      phaseKey: phase.phaseKey,
    })

    control.sprints
      .filter(sprint => sprint.linkedPhaseKey === phase.phaseKey)
      .forEach((sprint) => {
        linkedSprintKeys.add(sprint.id)
        rows.push(buildSprintTimelineRow(sprint))
      })
  })

  control.sprints
    .filter(sprint => !linkedSprintKeys.has(sprint.id))
    .forEach((sprint) => {
      rows.push(buildSprintTimelineRow(sprint))
    })

  return rows
}

function buildSprintTimelineRow(sprint: HybridControlSprint): HybridTimelineRow {
  return {
    id: sprint.id,
    type: 'sprint',
    typeLabel: 'Спринт',
    title: sprint.name,
    meta: sprint.focus || sprint.goal || 'Спринтовый цикл',
    tone: sprint.status === 'review' ? 'warning' : sprint.status === 'active' ? 'critical' : 'stable',
    statusLabel: SPRINT_STATUS_LABELS[sprint.status],
    progressLabel: `${sprint.tasks.filter(task => task.status === 'done').length} / ${sprint.tasks.length}`,
    startDate: sprint.startDate || '',
    endDate: sprint.endDate || '',
    linkedPhaseKey: sprint.linkedPhaseKey || '',
  }
}

export function buildHybridTimelineBounds(rows: HybridTimelineRow[], scale: HybridTimelineScale = 'weeks'): HybridTimelineBounds {
  const dates = rows.flatMap((row) => {
    const range = resolveHybridTimelineRowRange(row)
    return [range.start.getTime(), range.end.getTime()]
  })
  const now = startOfHybridTimelineScale(new Date(), scale)
  const minTime = dates.length ? Math.min(...dates) : now.getTime()
  const maxTime = dates.length ? Math.max(...dates) : now.getTime() + TIMELINE_MIN_SPAN_MS[scale]
  const start = startOfHybridTimelineScale(new Date(minTime), scale)
  const minEnd = new Date(start.getTime() + TIMELINE_MIN_SPAN_MS[scale])
  const end = endOfHybridTimelineScale(new Date(Math.max(maxTime, minEnd.getTime())), scale)
  return { start, end }
}

export function buildHybridTimelineColumns(bounds: HybridTimelineBounds, scale: HybridTimelineScale = 'weeks'): HybridTimelineColumn[] {
  const columns: HybridTimelineColumn[] = []
  let cursor = new Date(bounds.start)
  const end = bounds.end.getTime()

  while (cursor.getTime() <= end) {
    columns.push({
      key: buildHybridTimelineColumnKey(cursor, scale),
      label: buildHybridTimelineColumnLabel(cursor, scale),
      rangeLabel: buildHybridTimelineColumnRangeLabel(cursor, scale),
      start: new Date(cursor),
    })
    cursor = advanceHybridTimelineScale(cursor, scale)
  }

  return columns
}

export function getHybridTimelineBarStyle(row: HybridTimelineRow, bounds: HybridTimelineBounds) {
  const range = resolveHybridTimelineRowRange(row)
  const totalMs = Math.max(bounds.end.getTime() - bounds.start.getTime(), 1)
  const offsetMs = Math.max(range.start.getTime() - bounds.start.getTime(), 0)
  const widthMs = Math.max(range.end.getTime() - range.start.getTime(), 86400000)
  const left = (offsetMs / totalMs) * 100
  const width = (widthMs / totalMs) * 100
  return {
    left: `${Math.min(left, 100)}%`,
    width: `${Math.min(Math.max(width, 6), 100 - Math.min(left, 100))}%`,
  }
}

function buildHybridTimelineColumnKey(value: Date, scale: HybridTimelineScale) {
  if (scale === 'months') return `${value.getFullYear()}-${`${value.getMonth() + 1}`.padStart(2, '0')}`
  if (scale === 'hours') return `${toIsoLocalDate(value)}-${`${value.getHours()}`.padStart(2, '0')}`
  return toIsoLocalDate(value)
}

function buildHybridTimelineColumnLabel(value: Date, scale: HybridTimelineScale) {
  if (scale === 'months') return value.toLocaleDateString('ru-RU', { month: 'short' })
  if (scale === 'days') return `${value.getDate()}`
  if (scale === 'hours') return `${`${value.getHours()}`.padStart(2, '0')}:00`
  return value.toLocaleDateString('ru-RU', { month: 'short' })
}

function buildHybridTimelineColumnRangeLabel(value: Date, scale: HybridTimelineScale) {
  if (scale === 'months') return `${value.getFullYear()}`
  if (scale === 'days') return value.toLocaleDateString('ru-RU', { weekday: 'short' })
  if (scale === 'hours') return value.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  const weekEnd = addTimelineDays(value, 6)
  return `${value.getDate()}-${weekEnd.getDate()}`
}