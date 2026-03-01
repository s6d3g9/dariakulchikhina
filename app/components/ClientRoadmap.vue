<template>
  <div class="rm-wrap glass-card">
    <h2 class="rm-title">Дорожная карта</h2>
    <div v-if="pending" class="rm-empty">Загрузка...</div>
    <div v-else-if="!groupedPhases.length" class="rm-empty">Этапов пока нет</div>
    <div v-else class="rm-phases">
      <div
        v-for="group in groupedPhases"
        :key="group.key"
        class="rm-phase"
      >
        <!-- Фаза-заголовок -->
        <div class="rm-phase-header">
          <div class="rm-phase-dot" :class="phaseDotClass(group.overallStatus)">
            <span class="rm-phase-dot-icon">{{ phaseIcon(group.overallStatus) }}</span>
          </div>
          <div class="rm-phase-meta">
            <span class="rm-phase-name">{{ group.label }}</span>
            <span class="rm-phase-status" :class="statusCss(group.overallStatus)">{{ statusLabel(group.overallStatus) }}</span>
          </div>
        </div>

        <!-- Этапы внутри фазы -->
        <div class="rm-phase-stages">
          <div
            v-for="stage in group.stages"
            :key="stage.id"
            class="rm-stage-row"
          >
            <div class="rm-stage-connector"></div>
            <div class="rm-stage-dot" :class="stageDotClass(stage.status)"></div>
            <div class="rm-stage-body">
              <div class="rm-stage-head">
                <span class="rm-stage-title">{{ stage.title }}</span>
                <span
                  v-if="stage.status !== 'pending'"
                  class="rm-stage-status"
                  :class="statusCss(stage.status)"
                >{{ statusLabel(stage.status) }}</span>
              </div>
              <div v-if="stage.dateStart || stage.dateEnd" class="rm-dates">
                <span v-if="stage.dateStart" class="rm-date">{{ fmtDate(stage.dateStart) }}</span>
                <span v-if="stage.dateStart && stage.dateEnd" class="rm-date"> — </span>
                <span v-if="stage.dateEnd" class="rm-date">{{ fmtDate(stage.dateEnd) }}</span>
              </div>
              <ul v-if="subItems(stage.description).length" class="rm-subitems">
                <li v-for="(item, i) in subItems(stage.description)" :key="i" class="rm-subitem">{{ item }}</li>
              </ul>
              <p v-if="stage.notes" class="rm-notes">{{ stage.notes }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  roadmapStatusLabel,
  roadmapStatusCssClass,
  roadmapPhaseFromStageKey,
  normalizeRoadmapStatus,
} from '~~/shared/utils/roadmap'
import { PROJECT_PHASES } from '~~/shared/types/catalogs'

const props = defineProps<{ slug: string }>()
const { data: rawStages, pending } = await useFetch<any[]>(`/api/projects/${props.slug}/roadmap`)

// Порядок фаз
const PHASE_ORDER = ['lead', 'concept', 'working_project', 'procurement', 'construction', 'commissioning']
// Фолбэк по позиции для этапов без stageKey
const PHASE_BY_IDX = PHASE_ORDER

const PHASE_LABELS: Record<string, string> = {
  lead:            'Фаза 0 · Инициация',
  concept:         'Фаза 1 · Концепция',
  working_project: 'Фаза 2 · Рабочий проект',
  procurement:     'Фаза 3 · Закупки',
  construction:    'Фаза 4 · Строительство',
  commissioning:   'Фаза 5 · Сдача',
}

function overallStatus(stages: any[]): string {
  const statuses = stages.map(s => normalizeRoadmapStatus(s.status))
  if (statuses.every(s => s === 'done' || s === 'skipped')) return 'done'
  if (statuses.some(s => s === 'in_progress')) return 'in_progress'
  if (statuses.some(s => s === 'done')) return 'in_progress' // частично
  return 'pending'
}

const groupedPhases = computed(() => {
  if (!rawStages.value?.length) return []
  const sorted = [...rawStages.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  // Группируем по фазам
  const map: Record<string, any[]> = {}
  sorted.forEach((stage, idx) => {
    const phase = roadmapPhaseFromStageKey(stage.stageKey) || PHASE_BY_IDX[idx] || 'lead'
    if (!map[phase]) map[phase] = []
    map[phase].push(stage)
  })

  return PHASE_ORDER
    .filter(pk => map[pk]?.length)
    .map(pk => ({
      key: pk,
      label: PHASE_LABELS[pk] || pk,
      stages: map[pk],
      overallStatus: overallStatus(map[pk]),
    }))
})

function statusLabel(s: string) { return roadmapStatusLabel(s) }
function statusCss(s: string)   { return roadmapStatusCssClass(s) }

function phaseDotClass(s: string) {
  return `rm-phase-dot--${normalizeRoadmapStatus(s)}`
}
function phaseIcon(s: string) {
  const st = normalizeRoadmapStatus(s)
  return st === 'done' ? '✓' : st === 'in_progress' ? '◉' : st === 'skipped' ? '—' : '○'
}
function stageDotClass(s: string) {
  return `rm-sdot--${normalizeRoadmapStatus(s)}`
}

function subItems(desc: string | null | undefined): string[] {
  if (!desc) return []
  return desc
    .split('\n')
    .map(l => l.replace(/^[\s\-\*•]+/, '').replace(/^\d+\.\s*/, '').trim())
    .filter(l => l.length > 0)
}

function fmtDate(val: string | null): string {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.rm-wrap { padding: 14px; }
.rm-title {
  margin: 0 0 14px;
  font-size: .78rem; letter-spacing: .9px; text-transform: uppercase;
  color: var(--glass-text); opacity: .45;
}
.rm-empty { color: var(--glass-text); opacity: .35; font-size: .86rem; }
.rm-phases { display: flex; flex-direction: column; gap: 16px; }

/* ── Фаза-блок ── */
.rm-phase {}

.rm-phase-header {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 8px;
}

.rm-phase-dot {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--glass-text) 6%, transparent);
  border: 2px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
  transition: background .2s, border-color .2s;
}
.rm-phase-dot--done     { background: rgba(22,163,74,.13);  border-color: rgba(22,163,74,.5);  }
.rm-phase-dot--in_progress { background: rgba(245,158,11,.12); border-color: rgba(245,158,11,.5); }
.rm-phase-dot--skipped  { opacity: .35; }
.rm-phase-dot--pending  { opacity: .55; }

.rm-phase-dot-icon {
  font-size: .72rem; font-weight: 700; line-height: 1;
  color: var(--glass-text);
}
.rm-phase-dot--done    .rm-phase-dot-icon { color: #16a34a; }
.rm-phase-dot--in_progress .rm-phase-dot-icon { color: #a16207; }

.rm-phase-meta { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.rm-phase-name { font-size: .84rem; font-weight: 600; color: var(--glass-text); }
.rm-phase-status {
  font-size: .63rem; letter-spacing: .5px; text-transform: uppercase;
  padding: 2px 7px; border-radius: 999px;
  background: var(--glass-bg); white-space: nowrap;
}
.rm-status--pending,
.rm-status--skipped   { color: var(--glass-text); opacity: .38; }
.rm-status--progress  { color: rgba(180,120,0,1);  background: rgba(255,200,80,.08); opacity: 1; }
.rm-status--done      { color: rgba(40,140,80,1);  background: rgba(60,160,100,.07); opacity: 1; }

/* ── Этапы внутри фазы ── */
.rm-phase-stages {
  padding-left: 15px;
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  margin-left: 15px;
  display: flex; flex-direction: column; gap: 8px;
}

.rm-stage-row {
  position: relative;
  display: flex; align-items: flex-start; gap: 8px;
}

.rm-stage-connector {
  display: none; /* линия уже у border-left родителя */
}

.rm-stage-dot {
  width: 12px; height: 12px; border-radius: 50%;
  flex-shrink: 0; margin-top: 3px;
  background: color-mix(in srgb, var(--glass-text) 12%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--glass-text) 22%, transparent);
  transition: background .2s;
}
.rm-sdot--done     { background: rgba(22,163,74,.25); border-color: rgba(22,163,74,.6); }
.rm-sdot--in_progress { background: rgba(245,158,11,.2); border-color: rgba(245,158,11,.6); }
.rm-sdot--skipped  { opacity: .3; }
.rm-sdot--pending  { opacity: .45; }

.rm-stage-body { flex: 1; min-width: 0; }

.rm-stage-head {
  display: flex; align-items: baseline; gap: 8px;
  flex-wrap: wrap; margin-bottom: 2px;
}
.rm-stage-title { font-size: .82rem; color: var(--glass-text); font-weight: 500; }
.rm-stage-status {
  font-size: .6rem; letter-spacing: .4px; text-transform: uppercase;
  padding: 1px 6px; border-radius: 999px;
  background: var(--glass-bg); white-space: nowrap; flex-shrink: 0;
}

.rm-dates { display: flex; gap: 4px; margin-bottom: 4px; flex-wrap: wrap; }
.rm-date { font-size: .72rem; color: var(--glass-text); opacity: .38; }

.rm-subitems {
  margin: 4px 0 2px; padding: 0; list-style: none;
  display: flex; flex-direction: column; gap: 2px;
}
.rm-subitem {
  position: relative; padding-left: 12px;
  font-size: .76rem; color: var(--glass-text); opacity: .55; line-height: 1.45;
}
.rm-subitem::before {
  content: '–'; position: absolute; left: 0; color: var(--glass-text); opacity: .3;
}
.rm-notes {
  margin: 4px 0 0; font-size: .74rem; color: var(--glass-text); opacity: .42; line-height: 1.42;
  font-style: italic;
}
</style>
