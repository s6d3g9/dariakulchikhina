<script setup lang="ts">
import type {
  MessengerPlatformActionCatalog,
  MessengerPlatformPhaseOption,
} from '../../composables/useMessengerProjectActions'

type MiniTimelineBounds = {
  start: Date
  end: Date
}

type MiniTimelineColumn = {
  key: string
  start: Date
}

type MiniTimelineGroup = {
  key: string
  label: string
  span: number
}

type MiniTimelineBar = {
  id: string
  title: string
  statusLabel: string
  hint: string
  style: {
    left: string
    width: string
  }
  tone: 'planned' | 'active' | 'done' | 'blocked' | 'review'
  current: boolean
}

const props = defineProps<{
  catalog: MessengerPlatformActionCatalog
}>()

const emit = defineEmits<{
  selectPhase: [phaseId: string]
}>()

const MIN_SPAN_MS = 69 * 86400000
const CELL_WIDTH = 36

const phaseStatusLabels: Record<MessengerPlatformPhaseOption['status'], string> = {
  planned: 'запланирована',
  active: 'в работе',
  blocked: 'заблокирована',
  done: 'завершена',
}

const phases = computed(() => [...props.catalog.phases].sort((left, right) => {
  const leftRange = resolveRange('phase', left.startDate, left.endDate)
  const rightRange = resolveRange('phase', right.startDate, right.endDate)
  return leftRange.start.getTime() - rightRange.start.getTime()
}))

const allRanges = computed(() => phases.value.map(phase => resolveRange('phase', phase.startDate, phase.endDate)))

const bounds = computed<MiniTimelineBounds>(() => {
  const now = startOfWeek(new Date())
  const minTime = allRanges.value.length
    ? Math.min(...allRanges.value.map(range => range.start.getTime()))
    : now.getTime()
  const maxTime = allRanges.value.length
    ? Math.max(...allRanges.value.map(range => range.end.getTime()))
    : addDays(now, 69).getTime()

  const start = startOfWeek(new Date(minTime))
  const minEnd = new Date(start.getTime() + MIN_SPAN_MS)
  const end = endOfWeek(new Date(Math.max(maxTime, minEnd.getTime())))

  return { start, end }
})

const columns = computed<MiniTimelineColumn[]>(() => {
  const result: MiniTimelineColumn[] = []
  let cursor = new Date(bounds.value.start)
  const last = bounds.value.end.getTime()

  while (cursor.getTime() <= last) {
    result.push({
      key: toIsoLocalDate(cursor),
      start: new Date(cursor),
    })

    cursor = addDays(cursor, 7)
  }

  return result
})

const groups = computed<MiniTimelineGroup[]>(() => {
  const result: MiniTimelineGroup[] = []

  columns.value.forEach((column) => {
    const key = `${column.start.getFullYear()}-${column.start.getMonth()}`
    const label = formatMonthLabel(column.start)
    const previous = result[result.length - 1]

    if (previous?.key === key) {
      previous.span += 1
      return
    }

    result.push({ key, label, span: 1 })
  })

  return result
})

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(columns.value.length, 1)}, minmax(${CELL_WIDTH}px, 1fr))`,
}))

const boardStyle = computed(() => ({
  minWidth: `${Math.max(columns.value.length * CELL_WIDTH, 280)}px`,
}))

const todayPosition = computed(() => {
  const totalMs = bounds.value.end.getTime() - bounds.value.start.getTime()
  if (totalMs <= 0) {
    return null
  }

  const now = Date.now()
  if (now < bounds.value.start.getTime() || now > bounds.value.end.getTime()) {
    return null
  }

  return `${((now - bounds.value.start.getTime()) / totalMs) * 100}%`
})

const phaseBars = computed<MiniTimelineBar[]>(() => phases.value.map((phase) => {
  const range = resolveRange('phase', phase.startDate, phase.endDate)
  const isCurrent = phase.phaseKey === props.catalog.project.activePhaseKey || phase.status === 'active'
  return {
    id: phase.id,
    title: phase.title,
    statusLabel: phaseStatusLabels[phase.status],
    hint: `${phase.title} · ${phaseStatusLabels[phase.status]} · ${formatDateRange(phase.startDate, phase.endDate)}`,
    style: buildBarStyle(range, bounds.value),
    tone: phase.status,
    current: isCurrent,
  }
}))

const activeSummary = computed(() => {
  return props.catalog.project.activePhaseTitle || 'Активная фаза не найдена'
})

const summaryCounter = computed(() => formatCountLabel(phases.value.length, 'фаза', 'фазы', 'фаз'))

const windowLabel = computed(() => `${formatCompactDate(bounds.value.start)} - ${formatCompactDate(bounds.value.end)}`)

function parseIsoDate(value?: string) {
  if (!value) return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

function toIsoLocalDate(value: Date) {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, '0')
  const day = `${value.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(value: Date, days: number) {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function startOfWeek(value: Date) {
  const next = new Date(value)
  next.setHours(0, 0, 0, 0)
  const shift = (next.getDay() + 6) % 7
  next.setDate(next.getDate() - shift)
  return next
}

function endOfWeek(value: Date) {
  const next = addDays(startOfWeek(value), 6)
  next.setHours(23, 59, 59, 999)
  return next
}

function resolveRange(kind: 'phase' | 'sprint', startDate?: string, endDate?: string) {
  const fallbackDays = kind === 'phase' ? 20 : 13
  const start = parseIsoDate(startDate)
  const end = parseIsoDate(endDate)

  if (start && end && end.getTime() >= start.getTime()) {
    return { start, end }
  }

  if (start) {
    return { start, end: addDays(start, fallbackDays) }
  }

  if (end) {
    return { start: addDays(end, -fallbackDays), end }
  }

  const fallbackStart = startOfWeek(new Date())
  return { start: fallbackStart, end: addDays(fallbackStart, fallbackDays) }
}

function buildBarStyle(range: { start: Date; end: Date }, timelineBounds: MiniTimelineBounds) {
  const totalMs = Math.max(timelineBounds.end.getTime() - timelineBounds.start.getTime(), 1)
  const offsetMs = Math.max(range.start.getTime() - timelineBounds.start.getTime(), 0)
  const widthMs = Math.max(range.end.getTime() - range.start.getTime(), 86400000)
  const left = (offsetMs / totalMs) * 100
  const width = (widthMs / totalMs) * 100
  const clampedLeft = Math.min(left, 100)
  const clampedWidth = Math.min(Math.max(width, 6), 100 - clampedLeft)

  return {
    left: `${clampedLeft}%`,
    width: `${clampedWidth}%`,
  }
}

function formatMonthLabel(value: Date) {
  return value.toLocaleDateString('ru-RU', {
    month: 'short',
    year: '2-digit',
  })
}

function formatCompactDate(value: Date) {
  return value.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  })
}

function formatDateRange(startDate?: string, endDate?: string) {
  if (startDate && endDate) {
    return `${startDate} - ${endDate}`
  }

  return startDate || endDate || 'период не задан'
}

function formatCountLabel(count: number, singular: string, paucal: string, plural: string) {
  const mod10 = count % 10
  const mod100 = count % 100

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} ${singular}`
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} ${paucal}`
  }

  return `${count} ${plural}`
}
</script>

<template>
  <div class="pmtl">
    <div class="pmtl__head">
      <div class="pmtl__title-wrap">
        <span class="pmtl__title">Таймлайн</span>
        <span class="pmtl__meta">{{ activeSummary }}</span>
      </div>
      <span class="pmtl__counter">{{ summaryCounter }}</span>
    </div>

    <div class="pmtl__scroller">
      <div class="pmtl__board" :style="boardStyle">
        <div class="pmtl__months" :style="gridStyle">
          <div
            v-for="group in groups"
            :key="group.key"
            class="pmtl__month"
            :style="{ gridColumn: `span ${group.span}` }"
          >
            {{ group.label }}
          </div>
        </div>

        <div class="pmtl__rows">
          <div v-for="bar in phaseBars" :key="bar.id" class="pmtl__row">
            <div class="pmtl__row-head">
              <button type="button" class="pmtl__row-link" @click="emit('selectPhase', bar.id)">
                <span class="pmtl__row-title">{{ bar.title }}</span>
              </button>
              <span class="pmtl__row-status">{{ bar.statusLabel }}</span>
            </div>

            <div class="pmtl__track" :title="bar.hint">
              <div class="pmtl__track-grid" :style="gridStyle">
                <span v-for="column in columns" :key="`${bar.id}-${column.key}`" class="pmtl__track-cell" />
              </div>
              <span v-if="todayPosition" class="pmtl__today" :style="{ left: todayPosition }" />
              <button
                class="pmtl__bar"
                :class="[
                  `pmtl__bar--${bar.tone}`,
                  { 'pmtl__bar--current': bar.current },
                ]"
                :style="bar.style"
                type="button"
                :aria-label="`Открыть детали фазы ${bar.title}`"
                @click="emit('selectPhase', bar.id)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="pmtl__footer">
      <span>{{ windowLabel }}</span>
      <span>{{ props.catalog.project.status || 'статус не указан' }}</span>
    </div>
  </div>
</template>

<style scoped>
.pmtl {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.pmtl__head,
.pmtl__footer,
.pmtl__row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.pmtl__row-link {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.pmtl__title-wrap {
  display: grid;
  gap: 2px;
}

.pmtl__title,
.pmtl__row-title {
  font-size: 12px;
  font-weight: 700;
  color: rgb(var(--v-theme-on-surface));
}

.pmtl__meta,
.pmtl__counter,
.pmtl__row-status,
.pmtl__footer {
  font-size: 11px;
  line-height: 1.45;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pmtl__scroller {
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 2px;
  scrollbar-width: none;
}

.pmtl__scroller::-webkit-scrollbar {
  display: none;
}

.pmtl__board {
  display: grid;
  gap: 10px;
}

.pmtl__rows {
  display: grid;
  gap: 10px;
}

.pmtl__months,
.pmtl__track-grid {
  display: grid;
}

.pmtl__month {
  min-width: 0;
  padding-bottom: 4px;
  border-inline-end: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface-variant));
}

.pmtl__row {
  display: grid;
  gap: 6px;
}

.pmtl__track {
  position: relative;
  min-height: 18px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.pmtl__track-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pmtl__track-cell {
  border-inline-end: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.pmtl__today {
  position: absolute;
  top: 2px;
  bottom: 2px;
  width: 2px;
  margin-left: -1px;
  background: rgba(var(--v-theme-primary), 0.6);
  box-shadow: 0 0 0 1px rgba(var(--v-theme-surface), 0.88);
  z-index: 2;
}

.pmtl__bar {
  position: absolute;
  top: 3px;
  bottom: 3px;
  cursor: pointer;
  padding: 0;
  border-radius: 999px;
  border: 1px solid transparent;
}

.pmtl__bar--planned {
  border-color: rgba(var(--v-theme-on-surface), 0.14);
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface-variant));
}

.pmtl__bar--active {
  border-color: rgba(var(--v-theme-primary), 0.44);
  background: rgba(var(--v-theme-primary), 0.18);
  color: rgb(var(--v-theme-primary));
}

.pmtl__bar--done {
  border-color: rgba(var(--v-theme-secondary), 0.24);
  background: rgba(var(--v-theme-secondary), 0.16);
  color: rgb(var(--v-theme-secondary));
}

.pmtl__bar--blocked,
.pmtl__bar--review {
  border-color: rgba(var(--v-theme-error), 0.34);
  background: rgba(var(--v-theme-error), 0.14);
  color: rgb(var(--v-theme-error));
}

.pmtl__bar--current {
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-on-primary), 0.18), 0 0 0 1px rgba(var(--v-theme-primary), 0.12);
}

@media (max-width: 560px) {
  .pmtl__month {
    font-size: 9px;
  }

  .pmtl__track {
    min-height: 16px;
  }
}
</style>