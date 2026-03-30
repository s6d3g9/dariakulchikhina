<template>
  <div class="cpc-root">
    <div class="cpc-hero">
      <div>
        <p class="cpc-eyebrow">Контроль проекта</p>
        <h2 class="cpc-title">Как проект ведётся и где находится сейчас</h2>
      </div>
      <span class="cpc-pill" :class="`cpc-pill--${summary.health.status}`">{{ summary.health.label }}</span>
    </div>

    <div class="cpc-grid">
      <section class="cpc-card">
        <p class="cpc-card__label">Текущая фаза</p>
        <h3 class="cpc-card__title">{{ summary.activePhase?.title || 'Фаза не определена' }}</h3>
        <p class="cpc-card__meta">Прогресс каркаса: {{ summary.phasePercent }}%</p>
      </section>
      <section class="cpc-card">
        <p class="cpc-card__label">Текущий спринт</p>
        <h3 class="cpc-card__title">{{ summary.activeSprint?.name || 'Спринт ещё не запущен' }}</h3>
        <p class="cpc-card__meta">Исполнение: {{ summary.doneTasks }} / {{ summary.totalTasks }} задач</p>
      </section>
      <section class="cpc-card">
        <p class="cpc-card__label">Следующий обзор</p>
        <h3 class="cpc-card__title">{{ control.nextReviewDate || 'Не назначен' }}</h3>
        <p class="cpc-card__meta">Следующая управленческая синхронизация</p>
      </section>
      <section class="cpc-card">
        <p class="cpc-card__label">Блокеры</p>
        <h3 class="cpc-card__title">{{ summary.blockerCount }}</h3>
        <p class="cpc-card__meta">Критических блокеров на текущий момент</p>
      </section>
    </div>

    <section class="cpc-section">
      <div class="cpc-section__head">
        <div>
          <div class="cpc-section__title">План-график проекта</div>
          <div class="cpc-section__meta">Фазы и спринты на одной временной шкале</div>
        </div>
        <div class="cpc-section__tools">
          <div class="cpc-scale-switch" role="tablist" aria-label="Масштаб таймлайна">
            <button
              v-for="option in timelineScaleOptions"
              :key="option"
              type="button"
              class="a-btn-sm cpc-scale-switch__btn"
              :class="{ 'cpc-scale-switch__btn--active': timelineScale === option }"
              @click="timelineScale = option"
            >
              {{ getTimelineScaleLabel(option) }}
            </button>
          </div>
        </div>
      </div>
      <div class="cpc-board-wrap">
        <div class="cpc-board" :style="timelineBoardStyle">
          <div class="cpc-board__head">
            <div class="cpc-board__cell cpc-board__cell--entity">Слой</div>
            <div class="cpc-board__cell cpc-board__cell--period">Период</div>
            <div class="cpc-board__timeline-head-stack">
              <div class="cpc-board__timeline-groups" :style="timelineGridStyle">
                <div
                  v-for="group in timelineGroups"
                  :key="group.key"
                  class="cpc-board__timeline-group-label"
                  :style="{ gridColumn: `span ${group.span}` }"
                >
                  <span>{{ group.label }}</span>
                </div>
              </div>
              <div class="cpc-board__timeline-head" :style="timelineGridStyle">
                <div
                  v-for="column in timelineColumns"
                  :key="column.key"
                  class="cpc-board__week-label"
                >
                  <span>{{ column.label }}</span>
                  <strong>{{ column.rangeLabel }}</strong>
                </div>
              </div>
            </div>
          </div>

          <div
            v-for="row in timelineRows"
            :key="row.id"
            class="cpc-board__row"
            :class="{ 'cpc-board__row--phase': row.type === 'phase' }"
          >
            <div class="cpc-board__cell cpc-board__cell--entity cpc-board__entity">
              <div class="cpc-board__entity-body">
                <div class="cpc-board__entity-top">
                  <span class="cpc-board__type">{{ row.typeLabel }}</span>
                  <span class="cpc-chip" :class="`cpc-chip--${row.tone}`">{{ row.statusLabel }}</span>
                </div>
                <strong class="cpc-board__title">{{ row.title }}</strong>
                <div class="cpc-board__meta-line">{{ row.meta }}</div>
              </div>
            </div>

            <div class="cpc-board__cell cpc-board__cell--period cpc-board__period">
              <span>{{ formatDateRange(row.startDate, row.endDate) }}</span>
              <strong>{{ row.progressLabel }}</strong>
            </div>

            <div class="cpc-board__timeline">
              <div class="cpc-board__weeks" :style="timelineGridStyle">
                <div
                  v-for="column in timelineColumns"
                  :key="`${row.id}-${column.key}`"
                  class="cpc-board__week"
                />
              </div>
              <div class="cpc-board__bar" :class="`cpc-board__bar--${row.tone}`" :style="getTimelineBarStyle(row)">
                <span class="cpc-board__bar-label">{{ row.title }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="cpc-section">
      <div class="cpc-section__head">
        <div class="cpc-section__title">Фазы проекта</div>
        <div class="cpc-section__meta">Фазовый каркас</div>
      </div>
      <div class="cpc-phase-list">
        <div v-for="phase in control.phases" :key="phase.id" class="cpc-phase-row">
          <div>
            <div class="cpc-phase-row__title">{{ phase.title }}</div>
            <div class="cpc-phase-row__meta">{{ phase.deliverable }}</div>
          </div>
          <div class="cpc-phase-row__right">
            <span class="cpc-chip" :class="`cpc-chip--${phase.status}`">{{ phaseStatusLabels[phase.status] }}</span>
            <span class="cpc-phase-row__pct">{{ phase.percent || 0 }}%</span>
          </div>
        </div>
      </div>
    </section>

    <section class="cpc-section" v-if="control.sprints.length">
      <div class="cpc-section__head">
        <div class="cpc-section__title">Активные циклы исполнения</div>
        <div class="cpc-section__meta">Спринтовый слой</div>
      </div>
      <div class="cpc-sprint-list">
        <div v-for="sprint in control.sprints" :key="sprint.id" class="cpc-sprint-row">
          <div>
            <div class="cpc-phase-row__title">{{ sprint.name }}</div>
            <div class="cpc-phase-row__meta">{{ sprint.goal || 'Цель спринта не заполнена' }}</div>
          </div>
          <div class="cpc-phase-row__right">
            <span class="cpc-chip" :class="`cpc-chip--${sprint.status}`">{{ sprintStatusLabels[sprint.status] }}</span>
            <span class="cpc-phase-row__pct">{{ sprint.tasks.filter(task => task.status === 'done').length }} / {{ sprint.tasks.length }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="cpc-section">
      <div class="cpc-section__head">
        <div class="cpc-section__title">Контрольные точки</div>
        <div class="cpc-section__meta">Состояние проекта</div>
      </div>
      <div class="cpc-checkpoint-list">
        <div v-for="checkpoint in control.checkpoints" :key="checkpoint.id" class="cpc-checkpoint">
          <div>
            <div class="cpc-phase-row__title">{{ checkpoint.title }}</div>
            <div class="cpc-phase-row__meta">{{ checkpoint.note || 'Состояние без комментария' }}</div>
          </div>
          <span class="cpc-chip" :class="`cpc-chip--${checkpoint.status}`">{{ checkpointStatusLabels[checkpoint.status] }}</span>
        </div>
      </div>
    </section>

    <section v-if="control.blockers.length" class="cpc-section">
      <div class="cpc-section__head">
        <div class="cpc-section__title">Текущие блокеры</div>
        <div class="cpc-section__meta">Что мешает движению</div>
      </div>
      <div class="cpc-blocker-list">
        <div v-for="(blocker, index) in control.blockers" :key="`client-blocker-${index}`" class="cpc-blocker">
          {{ blocker }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { buildHybridControlSummary, ensureHybridControl } from '~~/shared/utils/project-control'
import {
  buildHybridTimelineBounds,
  buildHybridTimelineColumns,
  buildHybridTimelineGroups,
  buildHybridTimelineRows,
  formatHybridTimelineDateRange,
  getHybridTimelineBarStyle,
  getHybridTimelineColumnWidth,
  getHybridTimelineScaleLabel,
  type HybridTimelineRow,
  type HybridTimelineScale,
} from '~~/shared/utils/project-control-timeline'
import type { HybridControlCheckpoint, HybridControlPhase, HybridControlSprint } from '~~/shared/types/project'

const props = defineProps<{ slug: string }>()

const { data: project } = await useFetch<any>(() => `/api/projects/${props.slug}`)

const control = computed(() => ensureHybridControl(project.value?.profile?.hybridControl, project.value || {}))
const summary = computed(() => buildHybridControlSummary(control.value))

const phaseStatusLabels: Record<HybridControlPhase['status'], string> = {
  planned: 'запланирована',
  active: 'в работе',
  blocked: 'заблокирована',
  done: 'завершена',
}

const sprintStatusLabels: Record<HybridControlSprint['status'], string> = {
  planned: 'запланирован',
  active: 'активен',
  review: 'на ревью',
  done: 'завершён',
}

const checkpointStatusLabels: Record<HybridControlCheckpoint['status'], string> = {
  stable: 'стабильно',
  warning: 'внимание',
  critical: 'критично',
}

const timelineScaleOptions: HybridTimelineScale[] = ['months', 'weeks', 'days', 'hours']
const timelineScale = ref<HybridTimelineScale>('weeks')

const timelineRows = computed(() => buildHybridTimelineRows(control.value))

const timelineBounds = computed(() => buildHybridTimelineBounds(timelineRows.value, timelineScale.value))

const timelineColumns = computed(() => buildHybridTimelineColumns(timelineBounds.value, timelineScale.value))

const timelineGroups = computed(() => buildHybridTimelineGroups(timelineColumns.value, timelineScale.value))

const timelineGridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${Math.max(timelineColumns.value.length, 1)}, minmax(0, 1fr))`,
}))

const timelineBoardStyle = computed(() => ({
  minWidth: `${410 + (timelineColumns.value.length * getHybridTimelineColumnWidth(timelineScale.value))}px`,
}))

function formatDateRange(startDate?: string, endDate?: string) {
  return formatHybridTimelineDateRange(startDate, endDate)
}

function getTimelineBarStyle(row: HybridTimelineRow) {
  return getHybridTimelineBarStyle(row, timelineBounds.value)
}

function getTimelineScaleLabel(scale: HybridTimelineScale) {
  return getHybridTimelineScaleLabel(scale)
}
</script>

<style scoped>
.cpc-root {
  display: flex;
  flex-direction: column;
  gap: 26px;
}

.cpc-hero {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 0 0;
}

.cpc-hero::before,
.cpc-card::before,
.cpc-phase-row::before,
.cpc-sprint-row::before,
.cpc-checkpoint::before,
.cpc-blocker::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 1px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--ds-accent) 36%, transparent), color-mix(in srgb, var(--glass-text) 8%, transparent) 62%, transparent);
}

.cpc-eyebrow,
.cpc-card__label,
.cpc-section__meta {
  margin: 0 0 6px;
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .16em;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.cpc-title,
.cpc-card__title,
.cpc-section__title,
.cpc-phase-row__title {
  margin: 0;
  color: var(--glass-text);
}

.cpc-title {
  font-size: clamp(1.1rem, 1.8vw, 1.4rem);
}

.cpc-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
}

.cpc-card,
.cpc-phase-row,
.cpc-sprint-row,
.cpc-checkpoint,
.cpc-blocker {
  position: relative;
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 14px 0 0;
}

.cpc-card__meta,
.cpc-phase-row__meta {
  font-size: .78rem;
  color: color-mix(in srgb, var(--glass-text) 56%, transparent);
}

.cpc-section {
  display: grid;
  gap: 14px;
}

.cpc-section__tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cpc-scale-switch {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cpc-scale-switch__btn {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  background: transparent;
  color: color-mix(in srgb, var(--glass-text) 54%, transparent);
  text-transform: uppercase;
  letter-spacing: .08em;
}

.cpc-scale-switch__btn--active {
  color: var(--glass-text);
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
}

.cpc-board-wrap {
  overflow-x: auto;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.cpc-board {
  min-width: 1040px;
}

.cpc-board__head,
.cpc-board__row {
  display: grid;
  grid-template-columns: minmax(240px, 1.15fr) 170px minmax(520px, 2fr);
  gap: 0;
  align-items: stretch;
}

.cpc-board__head {
  position: sticky;
  top: 0;
  z-index: 8;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  background: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
  backdrop-filter: blur(12px);
}

.cpc-board__row {
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.cpc-board__row--phase {
  background: color-mix(in srgb, var(--glass-text) 2%, transparent);
}

.cpc-board__cell,
.cpc-board__timeline-head-stack,
.cpc-board__timeline {
  min-height: 72px;
}

.cpc-board__cell {
  padding: 12px 0;
}

.cpc-board__head .cpc-board__cell,
.cpc-board__head .cpc-board__timeline-head-stack,
.cpc-board__head .cpc-board__timeline-groups,
.cpc-board__head .cpc-board__timeline-head,
.cpc-board__head .cpc-board__timeline-group-label,
.cpc-board__head .cpc-board__week-label {
  background: color-mix(in srgb, var(--glass-bg) 94%, white 6%);
}

.cpc-board__cell--period {
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  border-right: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  padding: 12px 14px;
}

.cpc-board__entity,
.cpc-board__period {
  display: grid;
  gap: 6px;
  align-content: center;
}

.cpc-board__entity-top {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.cpc-board__type {
  font-size: .68rem;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 42%, transparent);
}

.cpc-board__title {
  font-size: .92rem;
  letter-spacing: .03em;
}

.cpc-board__meta-line,
.cpc-board__period span,
.cpc-board__week-label {
  font-size: .72rem;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.cpc-board__period strong,
.cpc-board__week-label strong {
  font-size: .76rem;
  color: var(--glass-text);
}

.cpc-board__timeline-head-stack,
.cpc-board__timeline-groups,
.cpc-board__timeline-head,
.cpc-board__weeks {
  display: grid;
}

.cpc-board__timeline-head-stack {
  grid-template-rows: auto auto;
}

.cpc-board__timeline-groups {
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.cpc-board__timeline-group-label,
.cpc-board__week-label {
  display: grid;
  gap: 4px;
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.cpc-board__timeline-group-label {
  min-height: 34px;
  padding: 8px 10px;
  align-content: center;
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .12em;
  color: color-mix(in srgb, var(--glass-text) 54%, transparent);
}

.cpc-board__week-label {
  padding: 12px 10px;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.cpc-board__timeline {
  position: relative;
}

.cpc-board__weeks {
  height: 100%;
}

.cpc-board__week {
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 7%, transparent);
}

.cpc-board__bar {
  position: absolute;
  top: 14px;
  bottom: 14px;
  min-width: 56px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border: 1px solid currentColor;
  background: color-mix(in srgb, currentColor 8%, transparent);
  overflow: hidden;
}

.cpc-board__bar--stable {
  color: color-mix(in srgb, var(--glass-text) 78%, transparent);
}

.cpc-board__bar--warning {
  color: var(--ds-warning);
}

.cpc-board__bar--critical {
  color: var(--ds-error);
}

.cpc-board__bar-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: .74rem;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.cpc-section__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.cpc-phase-list,
.cpc-sprint-list,
.cpc-checkpoint-list,
.cpc-blocker-list {
  display: grid;
  gap: 12px;
}

.cpc-phase-row__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cpc-pill,
.cpc-chip {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  text-transform: uppercase;
  letter-spacing: .08em;
  font-size: .68rem;
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}

.cpc-phase-row__pct {
  font-size: .78rem;
  font-weight: 600;
}

.cpc-pill--stable,
.cpc-chip--done,
.cpc-chip--stable { color: var(--ds-success); }
.cpc-pill--warning,
.cpc-chip--warning,
.cpc-chip--review { color: var(--ds-warning); }
.cpc-pill--critical,
.cpc-chip--critical,
.cpc-chip--blocked { color: var(--ds-error); }
.cpc-chip--active,
.cpc-chip--doing { color: var(--ds-accent); }

@media (max-width: 768px) {
  .cpc-grid {
    grid-template-columns: 1fr;
  }

  .cpc-hero,
  .cpc-card,
  .cpc-phase-row,
  .cpc-sprint-row,
  .cpc-checkpoint,
  .cpc-section__head {
    flex-direction: column;
  }

  .cpc-section__tools {
    width: 100%;
  }
}
</style>