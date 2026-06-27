<template>
  <GlassSurface class="crm-root">
    <div v-if="pending" class="crm-loading">
      <div v-for="index in 5" :key="index" class="crm-skeleton" />
    </div>

    <template v-else>
      <header class="crm-header">
        <div>
          <p class="crm-kicker">roadmap</p>
          <h2 class="crm-title">Карта проекта</h2>
        </div>
        <div class="crm-summary">
          <span class="crm-summary__item">
            <strong>{{ summary.phasePercent }}%</strong>
            этапы
          </span>
          <span class="crm-summary__item">
            <strong>{{ summary.taskPercent }}%</strong>
            задачи
          </span>
          <span class="crm-summary__item" :class="{ 'crm-summary__item--warning': summary.blockerCount > 0 }">
            <strong>{{ summary.blockerCount }}</strong>
            риски
          </span>
          <span class="crm-summary__item">
            <strong>{{ summary.completedPhases }}/{{ summary.totalPhases }}</strong>
            фазы
          </span>
        </div>
      </header>

      <section class="crm-panel crm-panel--status">
        <div class="crm-status-grid">
          <article class="crm-status-card">
            <span>активная фаза</span>
            <strong>{{ summary.activePhaseTitle }}</strong>
          </article>
          <article class="crm-status-card">
            <span>текущий спринт</span>
            <strong>{{ summary.activeSprintTitle }}</strong>
          </article>
          <article class="crm-status-card">
            <span>следующий шаг</span>
            <strong>{{ summary.nextMilestoneTitle }}</strong>
          </article>
          <article class="crm-status-card">
            <span>review</span>
            <strong>{{ formatDate(summary.nextReviewDate) || 'не назначен' }}</strong>
          </article>
        </div>
      </section>

      <section class="crm-panel">
        <div class="crm-section-head">
          <div>
            <div class="crm-section-title">Этапы</div>
            <div class="crm-section-meta">{{ summary.healthLabel }}</div>
          </div>
        </div>

        <div class="crm-phase-list">
          <article
            v-for="phase in phases"
            :key="phase.id"
            class="crm-phase"
            :class="[`crm-phase--${phase.status}`, { 'crm-phase--active': phase.active }]"
          >
            <div class="crm-phase__track">
              <span class="crm-phase__dot">{{ phase.percent }}</span>
              <span class="crm-phase__line" />
            </div>
            <div class="crm-phase__body">
              <div class="crm-row">
                <span class="crm-pill" :class="`crm-pill--${phase.status}`">{{ phase.statusLabel }}</span>
                <span class="crm-date">{{ formatRange(phase.startDate, phase.endDate) }}</span>
              </div>
              <h3 class="crm-item-title">{{ phase.title }}</h3>
              <p v-if="phase.deliverable" class="crm-copy">{{ phase.deliverable }}</p>
              <div class="crm-progress">
                <span class="crm-progress__bar">
                  <span :style="{ width: `${phase.percent}%` }" />
                </span>
                <span>{{ phase.gatesDone }}/{{ phase.gatesTotal || 0 }} ворот</span>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="crm-panel">
        <div class="crm-section-head">
          <div>
            <div class="crm-section-title">Спринты</div>
            <div class="crm-section-meta">{{ sprintMeta }}</div>
          </div>
        </div>

        <div v-if="visibleSprints.length" class="crm-sprint-grid">
          <article
            v-for="sprint in visibleSprints"
            :key="sprint.id"
            class="crm-sprint"
            :class="[`crm-sprint--${sprint.status}`, { 'crm-sprint--active': sprint.active, 'crm-sprint--overdue': sprint.overdue }]"
          >
            <div class="crm-row">
              <span class="crm-pill" :class="`crm-pill--${sprint.status}`">{{ sprint.statusLabel }}</span>
              <span class="crm-date">{{ formatRange(sprint.startDate, sprint.endDate) }}</span>
            </div>
            <h3 class="crm-item-title">{{ sprint.name }}</h3>
            <p v-if="sprint.goal" class="crm-copy">{{ sprint.goal }}</p>
            <div class="crm-progress">
              <span class="crm-progress__bar">
                <span :style="{ width: `${sprint.progressPercent}%` }" />
              </span>
              <span>{{ sprint.tasksDone }}/{{ sprint.tasksTotal }} задач</span>
            </div>
          </article>
        </div>
        <div v-else class="crm-empty">Спринты пока не сформированы</div>
      </section>

      <section class="crm-panel crm-panel--split">
        <div>
          <div class="crm-section-head">
            <div>
              <div class="crm-section-title">Контрольные точки</div>
              <div class="crm-section-meta">{{ checkpoints.length }}</div>
            </div>
          </div>
          <div v-if="checkpoints.length" class="crm-check-list">
            <article
              v-for="checkpoint in checkpoints"
              :key="checkpoint.id"
              class="crm-check"
              :class="`crm-check--${checkpoint.status}`"
            >
              <span class="crm-check__title">{{ checkpoint.title }}</span>
              <span class="crm-pill" :class="`crm-pill--${checkpoint.status}`">{{ checkpoint.statusLabel }}</span>
            </article>
          </div>
          <div v-else class="crm-empty">Контрольные точки не опубликованы</div>
        </div>

        <div>
          <div class="crm-section-head">
            <div>
              <div class="crm-section-title">Отчёты</div>
              <div class="crm-section-meta">{{ reports.length }}</div>
            </div>
          </div>
          <div v-if="reports.length" class="crm-report-list">
            <article
              v-for="report in reports"
              :key="report.id"
              class="crm-report"
              :class="`crm-report--${report.tone}`"
            >
              <div class="crm-row">
                <span class="crm-pill" :class="`crm-pill--${report.tone}`">{{ report.toneLabel }}</span>
                <span class="crm-date">{{ formatDate(report.occurredAt) }}</span>
              </div>
              <h3 class="crm-item-title">{{ report.title }}</h3>
              <p v-if="report.summary" class="crm-copy">{{ report.summary }}</p>
              <div v-if="report.nextSteps.length || report.approvals.length" class="crm-tags">
                <span v-for="step in report.nextSteps" :key="`step:${report.id}:${step}`" class="crm-tag">{{ step }}</span>
                <span v-for="approval in report.approvals" :key="`approval:${report.id}:${approval}`" class="crm-tag crm-tag--approval">{{ approval }}</span>
              </div>
            </article>
          </div>
          <div v-else class="crm-empty">Отчёты появятся после проектных коммуникаций</div>
        </div>
      </section>
    </template>
  </GlassSurface>
</template>

<script setup lang="ts">
import type {
  ApiV1ClientProjectRoadmap,
  ApiV1Envelope,
} from '~~/shared/types/api-v1'

const props = defineProps<{ slug: string }>()
const reqHeaders = useRequestHeaders(['cookie'])

const { data: roadmapEnvelope, pending } = await useFetch<ApiV1Envelope<ApiV1ClientProjectRoadmap>>(
  () => `/api/v1/client/projects/${props.slug}/roadmap`,
  { headers: reqHeaders },
)

const fallbackSummary = {
  healthStatus: 'stable',
  healthLabel: 'стабильно',
  activePhaseTitle: 'Фаза не определена',
  activeSprintTitle: 'Активного спринта нет',
  nextMilestoneTitle: 'Следующий этап не определён',
  nextReviewDate: '',
  phasePercent: 0,
  taskPercent: 0,
  totalTasks: 0,
  doneTasks: 0,
  completedPhases: 0,
  totalPhases: 0,
  blockerCount: 0,
  overdueSprints: 0,
}

const roadmap = computed(() => roadmapEnvelope.value?.data || null)
const summary = computed(() => roadmap.value?.summary || fallbackSummary)
const phases = computed(() => roadmap.value?.phases || [])
const sprints = computed(() => roadmap.value?.sprints || [])
const checkpoints = computed(() => roadmap.value?.checkpoints || [])
const reports = computed(() => roadmap.value?.reports || [])
const visibleSprints = computed(() => {
  const active = sprints.value.filter(sprint => sprint.active || sprint.status === 'active' || sprint.status === 'review')
  const upcoming = sprints.value.filter(sprint => sprint.status === 'planned')
  const completed = sprints.value.filter(sprint => sprint.status === 'done').slice(-2)
  return [...active, ...upcoming, ...completed].slice(0, 8)
})

const sprintMeta = computed(() => {
  if (!sprints.value.length) return '0'
  const activeCount = sprints.value.filter(sprint => sprint.active || sprint.status === 'active' || sprint.status === 'review').length
  if (summary.value.overdueSprints) return `${summary.value.overdueSprints} с риском срока`
  return activeCount ? `${activeCount} активных` : `${sprints.value.length} всего`
})

function formatDate(value: string) {
  if (!value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

function formatRange(startDate: string, endDate: string) {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  if (start && end) return `${start} - ${end}`
  return start || end || 'срок не задан'
}
</script>

<style scoped>
.crm-root {
  display: grid;
  gap: 18px;
  padding: 18px;
  color: var(--glass-text);
}

.crm-loading,
.crm-phase-list,
.crm-check-list,
.crm-report-list,
.crm-tags {
  display: grid;
}

.crm-loading,
.crm-phase-list,
.crm-check-list,
.crm-report-list {
  gap: 10px;
}

.crm-skeleton {
  min-height: 78px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 5%, var(--glass-bg));
  animation: crm-pulse 1.4s infinite ease-in-out;
}

@keyframes crm-pulse {
  0%, 100% { opacity: .42; }
  50% { opacity: .72; }
}

.crm-header,
.crm-summary,
.crm-row,
.crm-section-head,
.crm-phase,
.crm-check {
  display: flex;
}

.crm-header {
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.crm-kicker,
.crm-section-title,
.crm-section-meta,
.crm-date,
.crm-pill,
.crm-summary__item,
.crm-status-card span,
.crm-progress,
.crm-tag {
  letter-spacing: 0;
}

.crm-kicker {
  margin: 0 0 4px;
  font-size: .72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--glass-text) 46%, transparent);
}

.crm-title {
  margin: 0;
  font-size: 1.14rem;
  font-weight: 650;
  color: color-mix(in srgb, var(--glass-text) 88%, transparent);
}

.crm-summary {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.crm-summary__item,
.crm-status-card {
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 4%, var(--glass-bg));
}

.crm-summary__item {
  display: inline-grid;
  min-width: 76px;
  min-height: 52px;
  place-items: center;
  gap: 2px;
  padding: 8px 10px;
  font-size: .7rem;
  color: color-mix(in srgb, var(--glass-text) 54%, transparent);
  text-align: center;
}

.crm-summary__item strong {
  font-size: 1.02rem;
  color: color-mix(in srgb, var(--glass-text) 86%, transparent);
}

.crm-summary__item--warning {
  border-color: color-mix(in srgb, var(--ds-warning) 36%, transparent);
}

.crm-panel {
  display: grid;
  gap: 14px;
  padding-top: 16px;
  border-top: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
}

.crm-panel--status {
  padding-top: 0;
  border-top: 0;
}

.crm-panel--split {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;
}

.crm-status-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.crm-status-card {
  display: grid;
  gap: 8px;
  min-height: 86px;
  padding: 14px;
}

.crm-status-card span,
.crm-section-meta,
.crm-date,
.crm-progress {
  color: color-mix(in srgb, var(--glass-text) 52%, transparent);
  font-size: .72rem;
}

.crm-status-card strong {
  font-size: .94rem;
  line-height: 1.35;
  color: color-mix(in srgb, var(--glass-text) 86%, transparent);
}

.crm-section-head {
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.crm-section-title {
  font-size: .82rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--glass-text) 82%, transparent);
}

.crm-section-meta {
  margin-top: 3px;
}

.crm-phase {
  position: relative;
  gap: 12px;
}

.crm-phase__track {
  display: grid;
  justify-items: center;
  grid-template-rows: 34px 1fr;
  width: 34px;
  flex: 0 0 34px;
}

.crm-phase__dot {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  font-size: .68rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--glass-text) 76%, transparent);
}

.crm-phase__line {
  width: 1px;
  min-height: 26px;
  background: color-mix(in srgb, var(--glass-text) 12%, transparent);
}

.crm-phase:last-child .crm-phase__line {
  display: none;
}

.crm-phase__body,
.crm-sprint,
.crm-check,
.crm-report {
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 4%, var(--glass-bg));
}

.crm-phase__body,
.crm-sprint,
.crm-report {
  display: grid;
  gap: 9px;
  min-width: 0;
  padding: 14px 16px;
}

.crm-phase__body {
  flex: 1;
}

.crm-phase--active .crm-phase__dot,
.crm-sprint--active {
  border-color: color-mix(in srgb, var(--glass-text) 28%, transparent);
}

.crm-row {
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.crm-pill {
  display: inline-flex;
  align-items: center;
  min-height: 26px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  font-size: .72rem;
  color: color-mix(in srgb, var(--glass-text) 62%, transparent);
}

.crm-pill--done,
.crm-pill--stable {
  border-color: color-mix(in srgb, var(--ds-success) 30%, transparent);
  color: color-mix(in srgb, var(--ds-success) 70%, var(--glass-text));
}

.crm-pill--active,
.crm-pill--review {
  border-color: color-mix(in srgb, var(--glass-text) 24%, transparent);
  color: color-mix(in srgb, var(--glass-text) 76%, transparent);
}

.crm-pill--blocked,
.crm-pill--warning,
.crm-pill--critical {
  border-color: color-mix(in srgb, var(--ds-warning) 38%, transparent);
  color: color-mix(in srgb, var(--ds-warning) 74%, var(--glass-text));
}

.crm-date {
  font-size: .72rem;
}

.crm-item-title {
  margin: 0;
  font-size: .94rem;
  font-weight: 650;
  color: color-mix(in srgb, var(--glass-text) 86%, transparent);
}

.crm-copy {
  margin: 0;
  font-size: .82rem;
  line-height: 1.5;
  color: color-mix(in srgb, var(--glass-text) 62%, transparent);
}

.crm-progress {
  display: flex;
  align-items: center;
  gap: 9px;
}

.crm-progress__bar {
  position: relative;
  width: min(180px, 48vw);
  height: 6px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
}

.crm-progress__bar span {
  position: absolute;
  inset: 0 auto 0 0;
  border-radius: inherit;
  background: color-mix(in srgb, var(--glass-text) 66%, transparent);
}

.crm-sprint-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.crm-sprint--overdue {
  border-color: color-mix(in srgb, var(--ds-warning) 38%, transparent);
}

.crm-check {
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 56px;
  padding: 12px 14px;
}

.crm-check__title {
  min-width: 0;
  font-size: .86rem;
  color: color-mix(in srgb, var(--glass-text) 82%, transparent);
}

.crm-tags {
  gap: 6px;
}

.crm-tag {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  min-height: 26px;
  align-items: center;
  padding: 4px 9px;
  border: 1px solid color-mix(in srgb, var(--glass-text) 12%, transparent);
  border-radius: 8px;
  font-size: .72rem;
  color: color-mix(in srgb, var(--glass-text) 56%, transparent);
}

.crm-tag--approval {
  border-color: color-mix(in srgb, var(--ds-success) 26%, transparent);
}

.crm-empty {
  padding: 22px 14px;
  border: 1px dashed color-mix(in srgb, var(--glass-text) 16%, transparent);
  border-radius: 8px;
  color: color-mix(in srgb, var(--glass-text) 48%, transparent);
  text-align: center;
}

@media (max-width: 900px) {
  .crm-status-grid,
  .crm-panel--split,
  .crm-sprint-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .crm-root {
    padding: 14px;
  }

  .crm-header {
    display: grid;
  }

  .crm-summary {
    justify-content: stretch;
  }

  .crm-summary__item {
    min-width: 0;
    flex: 1 1 120px;
  }
}
</style>
