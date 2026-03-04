<template>
  <aside class="sb-status-bar">
    <!-- ── Loading skeleton ── -->
    <template v-if="pending && !stats">
      <div class="sb-card glass-card sb-skeleton" v-for="i in 4" :key="i">
        <div class="sb-sk-line sb-sk-title" />
        <div class="sb-sk-line sb-sk-value" />
      </div>
    </template>

    <template v-else-if="stats">
      <!-- ═══ Summary card ═══ -->
      <div class="sb-card glass-card sb-card--summary">
        <div class="sb-card-title">Обзор</div>
        <div class="sb-summary-grid">
          <div class="sb-metric">
            <span class="sb-metric-value">{{ stats.totals.projects }}</span>
            <span class="sb-metric-label">проектов</span>
          </div>
          <div class="sb-metric">
            <span class="sb-metric-value">{{ stats.totals.clients }}</span>
            <span class="sb-metric-label">клиентов</span>
          </div>
          <div class="sb-metric">
            <span class="sb-metric-value">{{ stats.totals.designers }}</span>
            <span class="sb-metric-label">дизайнеров</span>
          </div>
          <div class="sb-metric">
            <span class="sb-metric-value">{{ stats.totals.contractors }}</span>
            <span class="sb-metric-label">подрядчиков</span>
          </div>
        </div>
      </div>

      <!-- ═══ Phase distribution ═══ -->
      <div class="sb-card glass-card sb-card--phases">
        <div class="sb-card-title">Стадии проектов</div>
        <div class="sb-phases">
          <div v-for="ph in phaseRows" :key="ph.key" class="sb-phase-row">
            <span class="sb-phase-dot" :class="`sb-dot--${ph.color}`" />
            <span class="sb-phase-label">{{ ph.label }}</span>
            <span class="sb-phase-count">{{ ph.count }}</span>
            <div class="sb-phase-bar-track">
              <div class="sb-phase-bar-fill" :class="`sb-bar--${ph.color}`" :style="{ width: phasePercent(ph.count) }" />
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ Tasks progress ═══ -->
      <div class="sb-card glass-card sb-card--tasks">
        <div class="sb-card-title">Задачи</div>
        <div class="sb-tasks-ring-wrap">
          <svg class="sb-ring" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke-width="7"
              stroke="color-mix(in srgb, var(--glass-text) 8%, transparent)" />
            <circle cx="40" cy="40" r="34" fill="none" stroke-width="7"
              :stroke="overduePercent > 0 ? 'var(--ds-error, #dc2626)' : '#15803d'"
              stroke-linecap="round"
              :stroke-dasharray="ringDash"
              :stroke-dashoffset="ringOffset"
              transform="rotate(-90 40 40)" />
          </svg>
          <div class="sb-ring-label">
            <span class="sb-ring-value">{{ donePercent }}<small>%</small></span>
          </div>
        </div>
        <div class="sb-tasks-legend">
          <div class="sb-tasks-row">
            <span class="sb-tasks-dot sb-tasks-dot--done" />
            <span>Выполнено</span>
            <span class="sb-tasks-num">{{ stats.totals.done }}</span>
          </div>
          <div class="sb-tasks-row">
            <span class="sb-tasks-dot sb-tasks-dot--total" />
            <span>Всего</span>
            <span class="sb-tasks-num">{{ stats.totals.tasks }}</span>
          </div>
          <div v-if="stats.totals.overdue > 0" class="sb-tasks-row sb-tasks-row--overdue">
            <span class="sb-tasks-dot sb-tasks-dot--overdue" />
            <span>Просрочено</span>
            <span class="sb-tasks-num">{{ stats.totals.overdue }}</span>
          </div>
        </div>
      </div>

      <!-- ═══ Per-project mini cards ═══ -->
      <div class="sb-card glass-card sb-card--projects">
        <div class="sb-card-title">Прогресс по проектам</div>
        <div class="sb-projects-list">
          <NuxtLink v-for="p in stats.projects" :key="p.id" :to="`/admin/projects/${p.slug}`" class="sb-project-item">
            <div class="sb-project-head">
              <span class="sb-project-name">{{ p.title }}</span>
              <span class="sb-phase-chip" :class="`pj-phase--${phaseColor(p.status)}`">{{ phaseLabel(p.status) }}</span>
            </div>
            <div v-if="p.taskTotal > 0" class="sb-project-bar-wrap">
              <div class="sb-project-bar-track">
                <div class="sb-project-bar-fill" :style="{ width: projectPercent(p) }" />
              </div>
              <span class="sb-project-progress-text">{{ p.taskDone }}/{{ p.taskTotal }}</span>
            </div>
            <span v-if="p.taskOverdue > 0" class="sb-project-overdue">⚠ {{ p.taskOverdue }} просрочено</span>
          </NuxtLink>
        </div>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import { PROJECT_PHASES } from '~~/shared/types/catalogs'

const { data: stats, pending } = useFetch<any>('/api/admin/stats', {
  server: false,
  default: () => null,
})

const phaseRows = computed(() => {
  if (!stats.value) return []
  return PROJECT_PHASES.map(ph => ({
    key: ph.key,
    label: ph.label,
    color: ph.color,
    count: stats.value.phases[ph.key] || 0,
  }))
})

const donePercent = computed(() => {
  if (!stats.value || !stats.value.totals.tasks) return 0
  return Math.round(stats.value.totals.done / stats.value.totals.tasks * 100)
})

const overduePercent = computed(() => {
  if (!stats.value || !stats.value.totals.tasks) return 0
  return Math.round(stats.value.totals.overdue / stats.value.totals.tasks * 100)
})

const CIRCUMFERENCE = 2 * Math.PI * 34 // ~213.6
const ringDash = `${CIRCUMFERENCE}`
const ringOffset = computed(() => {
  const pct = donePercent.value / 100
  return `${CIRCUMFERENCE * (1 - pct)}`
})

function phasePercent(count: number) {
  if (!stats.value?.totals?.projects) return '0%'
  return Math.round(count / stats.value.totals.projects * 100) + '%'
}

function phaseLabel(status: string) { return PROJECT_PHASES.find(p => p.key === status)?.label || status }
function phaseColor(status: string) { return PROJECT_PHASES.find(p => p.key === status)?.color || 'gray' }

function projectPercent(p: any) {
  if (!p.taskTotal) return '0%'
  return Math.round(p.taskDone / p.taskTotal * 100) + '%'
}
</script>

<style scoped>
.sb-status-bar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: sticky;
  top: 80px;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  scrollbar-width: thin;
  padding: 2px;
}

/* ── Card base ── */
.sb-card {
  padding: 14px 16px;
}
.sb-card-title {
  font-size: .58rem;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--glass-text);
  opacity: .4;
  font-weight: 600;
  margin-bottom: 10px;
}

/* ── Summary grid ── */
.sb-summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.sb-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 4px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}
.sb-metric-value {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--glass-text);
  line-height: 1;
}
.sb-metric-label {
  font-size: .54rem;
  color: var(--glass-text);
  opacity: .4;
  margin-top: 2px;
}

/* ── Phase distribution ── */
.sb-phases {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.sb-phase-row {
  display: grid;
  grid-template-columns: 8px 1fr auto 40px;
  gap: 6px;
  align-items: center;
  font-size: .66rem;
  color: var(--glass-text);
}
.sb-phase-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.sb-dot--gray    { background: color-mix(in srgb, var(--glass-text) 25%, transparent); }
.sb-dot--violet  { background: #7c3aed; }
.sb-dot--blue    { background: #2563eb; }
.sb-dot--amber   { background: #b45309; }
.sb-dot--orange  { background: #c2410c; }
.sb-dot--green   { background: #15803d; }
.sb-dot--teal    { background: #0f766e; }
html.dark .sb-dot--violet { background: #a78bfa; }
html.dark .sb-dot--blue   { background: #93c5fd; }
html.dark .sb-dot--amber  { background: #fcd34d; }
html.dark .sb-dot--orange { background: #fdba74; }
html.dark .sb-dot--green  { background: #86efac; }
html.dark .sb-dot--teal   { background: #5eead4; }

.sb-phase-label { opacity: .6; white-space: nowrap; }
.sb-phase-count { font-weight: 600; text-align: right; opacity: .5; }

.sb-phase-bar-track {
  height: 4px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--glass-text) 6%, transparent);
  overflow: hidden;
}
.sb-phase-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width .4s ease;
}
.sb-bar--gray    { background: color-mix(in srgb, var(--glass-text) 25%, transparent); }
.sb-bar--violet  { background: #7c3aed; }
.sb-bar--blue    { background: #2563eb; }
.sb-bar--amber   { background: #b45309; }
.sb-bar--orange  { background: #c2410c; }
.sb-bar--green   { background: #15803d; }
.sb-bar--teal    { background: #0f766e; }
html.dark .sb-bar--violet { background: #a78bfa; }
html.dark .sb-bar--blue   { background: #93c5fd; }
html.dark .sb-bar--amber  { background: #fcd34d; }
html.dark .sb-bar--orange { background: #fdba74; }
html.dark .sb-bar--green  { background: #86efac; }
html.dark .sb-bar--teal   { background: #5eead4; }

/* ── Tasks ring ── */
.sb-tasks-ring-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 8px;
}
.sb-ring {
  width: 100%;
  height: 100%;
}
.sb-ring circle {
  transition: stroke-dashoffset .6s ease;
}
.sb-ring-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sb-ring-value {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--glass-text);
}
.sb-ring-value small {
  font-size: .6em;
  opacity: .5;
}

.sb-tasks-legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sb-tasks-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: .64rem;
  color: var(--glass-text);
  opacity: .6;
}
.sb-tasks-row--overdue {
  color: var(--ds-error, #dc2626);
  opacity: 1;
  font-weight: 600;
}
.sb-tasks-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sb-tasks-dot--done { background: #15803d; }
html.dark .sb-tasks-dot--done { background: #86efac; }
.sb-tasks-dot--total { background: color-mix(in srgb, var(--glass-text) 15%, transparent); }
.sb-tasks-dot--overdue { background: var(--ds-error, #dc2626); }
.sb-tasks-num {
  margin-left: auto;
  font-weight: 600;
}

/* ── Per-project cards ── */
.sb-projects-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sb-project-item {
  display: block;
  text-decoration: none;
  color: var(--glass-text);
  padding: 8px 10px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--glass-text) 3%, transparent);
  transition: background 120ms ease;
}
.sb-project-item:hover {
  background: color-mix(in srgb, var(--glass-text) 7%, transparent);
}
.sb-project-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 4px;
}
.sb-project-name {
  font-size: .68rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.sb-phase-chip {
  font-size: .46rem;
  font-weight: 500;
  padding: 1px 5px;
  border-radius: var(--chip-radius, 999px);
  white-space: nowrap;
  flex-shrink: 0;
}

.sb-project-bar-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.sb-project-bar-track {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  overflow: hidden;
}
.sb-project-bar-fill {
  height: 100%;
  border-radius: 2px;
  background: #15803d;
  transition: width .3s;
}
html.dark .sb-project-bar-fill { background: #86efac; }
.sb-project-progress-text {
  font-size: .56rem;
  opacity: .4;
  white-space: nowrap;
}
.sb-project-overdue {
  font-size: .56rem;
  color: var(--ds-error, #dc2626);
  font-weight: 600;
}

/* ── Skeleton ── */
.sb-skeleton {
  min-height: 80px;
}
.sb-sk-line {
  border-radius: 4px;
  background: color-mix(in srgb, var(--glass-text) 6%, transparent);
  animation: sb-sk-pulse 1.2s ease-in-out infinite;
}
.sb-sk-title { width: 60%; height: 8px; margin-bottom: 12px; }
.sb-sk-value { width: 40%; height: 20px; }
@keyframes sb-sk-pulse {
  0%, 100% { opacity: .4; }
  50% { opacity: .15; }
}

/* ── Phase chip colors (reuse from parent) ── */
.pj-phase--gray    { color: var(--glass-text); opacity: .35; background: color-mix(in srgb, var(--glass-text) 6%, transparent); }
.pj-phase--violet  { color: #7c3aed; background: rgba(124,58,237,.08); }
.pj-phase--blue    { color: #2563eb; background: rgba(37,99,235,.08); }
.pj-phase--amber   { color: #b45309; background: rgba(180,83,9,.07); }
.pj-phase--orange  { color: #c2410c; background: rgba(194,65,12,.07); }
.pj-phase--green   { color: #15803d; background: rgba(21,128,61,.08); }
.pj-phase--teal    { color: #0f766e; background: rgba(15,118,110,.08); }
html.dark .pj-phase--violet { color: #a78bfa; background: rgba(167,139,250,.12); }
html.dark .pj-phase--blue   { color: #93c5fd; background: rgba(147,197,253,.12); }
html.dark .pj-phase--amber  { color: #fcd34d; background: rgba(252,211,77,.1); }
html.dark .pj-phase--orange { color: #fdba74; background: rgba(253,186,116,.1); }
html.dark .pj-phase--green  { color: #86efac; background: rgba(134,239,172,.1); }
html.dark .pj-phase--teal   { color: #5eead4; background: rgba(94,234,212,.1); }

/* ── Responsive ── */
@media (max-width: 1100px) {
  .sb-status-bar {
    display: none;
  }
}
</style>
