<template>
  <div class="cwp-root">

    <!-- ── Card: Design roadmap ───────────────────────────── -->
    <div class="cwp-card glass-card">
      <div class="cwp-card-head">
        <span class="cwp-card-icon">✦</span>
        <div>
          <div class="cwp-card-title">Дизайн-проект</div>
          <div class="cwp-card-sub">дорожная карта проектирования</div>
        </div>
        <span v-if="designProgress !== null" class="cwp-pct">{{ designProgress }}%</span>
      </div>

      <div v-if="rmPending" class="cwp-loading">Загрузка...</div>
      <div v-else-if="!groupedPhases.length" class="cwp-empty">Этапы ещё не заполнены</div>
      <div v-else class="cwp-timeline">
        <div v-for="group in groupedPhases" :key="group.key" class="cwp-phase">
          <div class="cwp-phase-row">
            <div class="cwp-dot cwp-dot--phase" :class="`cwp-dot--${group.overallStatus}`">
              <span class="cwp-dot-icon">{{ phaseIcon(group.overallStatus) }}</span>
            </div>
            <div class="cwp-phase-info">
              <span class="cwp-phase-name">{{ group.label }}</span>
              <span class="cwp-pill" :class="`cwp-pill--${group.overallStatus}`">{{ statusLabel(group.overallStatus) }}</span>
            </div>
          </div>
          <div class="cwp-stages">
            <div v-for="stage in group.stages" :key="stage.id" class="cwp-stage">
              <div class="cwp-dot cwp-dot--stage" :class="`cwp-dot--${normalizeRoadmapStatus(stage.status)}`" />
              <div class="cwp-stage-info">
                <span class="cwp-stage-title">{{ stage.title }}</span>
                <span v-if="stage.dateStart || stage.dateEnd" class="cwp-date">
                  {{ fmtDate(stage.dateStart) }}<template v-if="stage.dateEnd"> — {{ fmtDate(stage.dateEnd) }}</template>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Card: Construction work ──────────────────────── -->
    <div class="cwp-card glass-card">
      <div class="cwp-card-head">
        <span class="cwp-card-icon">⚒</span>
        <div>
          <div class="cwp-card-title">Строительные работы</div>
          <div class="cwp-card-sub">задачи по ремонту и монтажу</div>
        </div>
        <span v-if="buildProgress !== null" class="cwp-pct">{{ buildProgress }}%</span>
      </div>

      <div v-if="wsPending" class="cwp-loading">Загрузка...</div>
      <div v-else-if="!workItems?.length" class="cwp-empty">Задачи ещё не назначены</div>
      <div v-else class="cwp-tasks">
        <div v-for="item in workItems" :key="item.id" class="cwp-task">
          <div class="cwp-dot cwp-dot--stage" :class="`cwp-dot--${normalizeWorkStatus(item.status)}`" />
          <div class="cwp-task-body">
            <div class="cwp-task-head">
              <span class="cwp-task-title">{{ item.title }}</span>
              <span class="cwp-pill" :class="`cwp-pill--${normalizeWorkStatus(item.status)}`">{{ workStatusLabel(item.status) }}</span>
            </div>
            <div v-if="item.contractorName" class="cwp-task-meta">{{ item.contractorName }}</div>
            <div v-if="item.dateStart || item.dateEnd" class="cwp-task-meta">
              {{ item.dateStart }}<template v-if="item.dateEnd"> — {{ item.dateEnd }}</template>
            </div>
            <div v-if="item.notes" class="cwp-task-notes">{{ item.notes }}</div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import {
  normalizeRoadmapStatus,
  roadmapStatusLabel,
  roadmapPhaseFromStageKey,
} from '~~/shared/utils/roadmap'
import {
  normalizeWorkStatus,
  workStatusLabel,
} from '~~/shared/utils/work-status'

const props = defineProps<{ slug: string }>()

// ── Roadmap (design) ─────────────────────────────────────────
const { data: rawStages, pending: rmPending } = await useFetch<any[]>(`/api/projects/${props.slug}/roadmap`)

const PHASE_ORDER = ['lead', 'concept', 'working_project', 'procurement', 'construction', 'commissioning']
const PHASE_BY_IDX = PHASE_ORDER
const PHASE_LABELS: Record<string, string> = {
  lead:            'Инициация',
  concept:         'Концепция',
  working_project: 'Рабочий проект',
  procurement:     'Закупки',
  construction:    'Строительство',
  commissioning:   'Сдача',
}

function overallStatus(stages: any[]): string {
  const statuses = stages.map(s => normalizeRoadmapStatus(s.status))
  if (statuses.every(s => s === 'done' || s === 'skipped')) return 'done'
  if (statuses.some(s => s === 'in_progress')) return 'in_progress'
  if (statuses.some(s => s === 'done')) return 'in_progress'
  return 'pending'
}

const groupedPhases = computed(() => {
  if (!rawStages.value?.length) return []
  const sorted = [...rawStages.value].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const map: Record<string, any[]> = {}
  sorted.forEach((stage, idx) => {
    const phase = roadmapPhaseFromStageKey(stage.stageKey) || PHASE_BY_IDX[idx] || 'lead'
    if (!map[phase]) map[phase] = []
    map[phase].push(stage)
  })
  return PHASE_ORDER.filter(pk => map[pk]?.length).map(pk => ({
    key: pk,
    label: PHASE_LABELS[pk] || pk,
    stages: map[pk],
    overallStatus: overallStatus(map[pk]),
  }))
})

const designProgress = computed(() => {
  if (!rawStages.value?.length) return null
  const done = rawStages.value.filter(s => normalizeRoadmapStatus(s.status) === 'done').length
  return Math.round((done / rawStages.value.length) * 100)
})

// ── Work status (construction) ──────────────────────────────
const { data: workItems, pending: wsPending } = await useFetch<any[]>(`/api/projects/${props.slug}/work-status`)

const buildProgress = computed(() => {
  if (!workItems.value?.length) return null
  const done = workItems.value.filter(i => normalizeWorkStatus(i.status) === 'done').length
  return Math.round((done / workItems.value.length) * 100)
})

// ── Helpers ──────────────────────────────────────────────────
function statusLabel(s: string) { return roadmapStatusLabel(s) }

function phaseIcon(s: string) {
  const st = normalizeRoadmapStatus(s)
  return st === 'done' ? '✓' : st === 'in_progress' ? '◉' : st === 'skipped' ? '—' : '○'
}

function fmtDate(val: string | null | undefined): string {
  if (!val) return ''
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}
</script>

<style scoped>
.cwp-root { display: flex; flex-direction: column; gap: 20px; }

/* ── Card shell ── */
.cwp-card { padding: 18px; }

.cwp-card-head {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 16px; padding-bottom: 12px;
  border-bottom: 1px solid var(--glass-border);
}
.cwp-card-icon { font-size: 1.3rem; opacity: .6; flex-shrink: 0; }
.cwp-card-title { font-size: .88rem; font-weight: 600; color: var(--glass-text); }
.cwp-card-sub { font-size: .7rem; color: var(--glass-text); opacity: .4; margin-top: 1px; }
.cwp-pct {
  margin-left: auto; font-size: 1.1rem; font-weight: 700;
  color: var(--glass-text); opacity: .6; font-variant-numeric: tabular-nums;
}

.cwp-loading { font-size: .82rem; color: var(--glass-text); opacity: .4; }
.cwp-empty   { font-size: .82rem; color: var(--glass-text); opacity: .35; padding: 8px 0; }

/* ── Shared dot ── */
.cwp-dot {
  border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: background .2s, border-color .2s;
}
.cwp-dot--phase {
  width: 26px; height: 26px;
  background: color-mix(in srgb, var(--glass-text) 6%, transparent);
  border: 2px solid color-mix(in srgb, var(--glass-text) 14%, transparent);
}
.cwp-dot--stage {
  width: 10px; height: 10px; margin-top: 4px;
  background: color-mix(in srgb, var(--glass-text) 12%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--glass-text) 20%, transparent);
}
.cwp-dot--done        { background: rgba(22,163,74,.2);  border-color: rgba(22,163,74,.55); }
.cwp-dot--in_progress { background: rgba(245,158,11,.18); border-color: rgba(245,158,11,.55); }
.cwp-dot--skipped     { opacity: .3; }
.cwp-dot--pending     { opacity: .45; }

.cwp-dot-icon {
  font-size: .6rem; font-weight: 700; line-height: 1;
  color: var(--glass-text);
}
.cwp-dot--done .cwp-dot-icon        { color: #16a34a; }
.cwp-dot--in_progress .cwp-dot-icon { color: #a16207; }

/* ── Pill badge ── */
.cwp-pill {
  font-size: .6rem; letter-spacing: .4px; text-transform: uppercase;
  padding: 1px 7px; border-radius: 999px;
  background: var(--glass-bg); white-space: nowrap;
  color: var(--glass-text); opacity: .4;
}
.cwp-pill--done        { color: rgba(40,140,80,1);  background: rgba(60,160,100,.07); opacity: 1; }
.cwp-pill--in_progress { color: rgba(180,120,0,1);  background: rgba(255,200,80,.08); opacity: 1; }

/* ── Design timeline ── */
.cwp-timeline { display: flex; flex-direction: column; gap: 6px; }
.cwp-phase { margin-bottom: 4px; }

.cwp-phase-row {
  display: flex; align-items: center; gap: 10px;
  margin-bottom: 4px;
}
.cwp-phase-info { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.cwp-phase-name { font-size: .82rem; font-weight: 600; color: var(--glass-text); }

.cwp-stages {
  padding-left: 12px; margin-left: 12px;
  border-left: 1px solid color-mix(in srgb, var(--glass-text) 10%, transparent);
  display: flex; flex-direction: column; gap: 4px;
}
.cwp-stage {
  display: flex; align-items: flex-start; gap: 8px;
}
.cwp-stage-info { flex: 1; min-width: 0; }
.cwp-stage-title { font-size: .78rem; color: var(--glass-text); }
.cwp-date { font-size: .68rem; color: var(--glass-text); opacity: .35; margin-left: 6px; }

/* ── Construction tasks ── */
.cwp-tasks { display: flex; flex-direction: column; gap: 6px; }
.cwp-task {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 5%, transparent);
}
.cwp-task:last-child { border-bottom: none; }
.cwp-task-body { flex: 1; min-width: 0; }
.cwp-task-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.cwp-task-title { font-size: .82rem; font-weight: 500; color: var(--glass-text); }
.cwp-task-meta { font-size: .72rem; color: var(--glass-text); opacity: .4; margin-top: 2px; }
.cwp-task-notes { font-size: .74rem; color: var(--glass-text); opacity: .45; margin-top: 4px; font-style: italic; white-space: pre-line; }
</style>
