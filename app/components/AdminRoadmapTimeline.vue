<template>
  <div class="art-root">
    <!-- Header: progress bar + counts -->
    <div class="art-header">
      <div class="art-progress-wrap">
        <div class="art-progress-track">
          <div class="art-progress-fill" :style="{ width: progressPct + '%' }" />
        </div>
        <span class="art-pct">{{ progressPct }}%</span>
      </div>
      <div class="art-summary">
        <span v-if="doneCnt" class="art-sum-done">{{ doneCnt }} готово</span>
        <span v-if="inProgressCnt" class="art-sum-ip">{{ inProgressCnt }} в работе</span>
        <span class="art-sum-total">из {{ totalCnt }}</span>
      </div>
    </div>

    <!-- Stepper -->
    <div class="art-stepper">
      <template v-for="(phase, pi) in phases" :key="phase.key">
        <!-- Track segment (before each node except first) -->
        <div v-if="!!pi" class="art-track-seg">
          <div class="art-track-fill" :style="{ width: trackFillPct(phases.indexOf(phase)) + '%' }" />
        </div>
        <!-- Node -->
        <div class="art-step" :class="`art-step--${phase.status}`">
          <div class="art-step-node" :title="`${phase.label}: ${phase.done}/${phase.total}`">
            <svg v-if="phase.status === 'done'" class="art-check-icon" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span v-else-if="phase.status === 'in_progress'" class="art-ip-dot" />
            <span v-else-if="phase.status === 'partial'" class="art-partial-icon">◔</span>
            <span v-else class="art-num">{{ phases.indexOf(phase) + 1 }}</span>
            <span v-if="phase.status === 'in_progress'" class="art-pulse" />
          </div>
          <div class="art-step-body">
            <div class="art-step-name">{{ phase.short }}</div>
            <div v-if="phase.total > 0" class="art-step-cnt" :class="`art-step-cnt--${phase.status}`">
              {{ phase.done }}/{{ phase.total }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { normalizeRoadmapStatus, roadmapPhaseFromStageKey } from '~~/shared/utils/roadmap'

interface StageSummary {
  stageKey?: string | null
  status?: string | null
  title?: string | null
  sortOrder?: number | null
}

interface PhaseGroup {
  key: string
  label: string
  short: string
  total: number
  done: number
  inProgress: number
  status: string
  stages: StageSummary[]
}

const props = defineProps<{
  stages: StageSummary[]
}>()

const PHASE_ORDER = ['lead', 'concept', 'working_project', 'procurement', 'construction', 'commissioning']

const PHASE_LABELS: Record<string, { label: string; short: string }> = {
  lead:            { label: 'Инициация',      short: 'Инициация' },
  concept:         { label: 'Концепция',      short: 'Концепция' },
  working_project: { label: 'Рабочий проект', short: 'Проект' },
  procurement:     { label: 'Закупки',        short: 'Закупки' },
  construction:    { label: 'Стройка',        short: 'Стройка' },
  commissioning:   { label: 'Сдача',          short: 'Сдача' },
}

function computePhaseStatus(arr: StageSummary[]): string {
  const sts = arr.map(s => normalizeRoadmapStatus(s.status))
  if (sts.every(s => s === 'done' || s === 'skipped')) return 'done'
  if (sts.some(s => s === 'in_progress')) return 'in_progress'
  if (sts.some(s => s === 'done')) return 'partial'
  return 'pending'
}

const phases = computed<PhaseGroup[]>(() => {
  if (!props.stages?.length) return []
  const map: Record<string, StageSummary[]> = {}
  PHASE_ORDER.forEach(k => { map[k] = [] })

  const sorted = [...props.stages].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  sorted.forEach((stage: StageSummary, idx: number) => {
    const phKey = roadmapPhaseFromStageKey(stage.stageKey) || PHASE_ORDER[idx] || 'lead'
    if (!map[phKey]) map[phKey] = []
    map[phKey].push(stage)
  })

  return PHASE_ORDER
    .filter(k => (map[k] || []).length > 0)
    .map(k => {
      const arr = map[k] || []
      const done = arr.filter(s => {
        const ns = normalizeRoadmapStatus(s.status)
        return ns === 'done' || ns === 'skipped'
      }).length
      const inProgress = arr.filter(s => normalizeRoadmapStatus(s.status) === 'in_progress').length
      return {
        key: k,
        label: PHASE_LABELS[k]?.label ?? k,
        short: PHASE_LABELS[k]?.short ?? k,
        total: arr.length,
        done,
        inProgress,
        status: computePhaseStatus(arr),
        stages: arr,
      } satisfies PhaseGroup
    })
})

const totalCnt = computed(() => props.stages?.length ?? 0)

const doneCnt = computed(() =>
  (props.stages ?? []).filter((s: StageSummary) => {
    const ns = normalizeRoadmapStatus(s.status)
    return ns === 'done' || ns === 'skipped'
  }).length
)

const inProgressCnt = computed(() =>
  (props.stages ?? []).filter((s: StageSummary) => normalizeRoadmapStatus(s.status) === 'in_progress').length
)

const progressPct = computed(() => {
  if (!totalCnt.value) return 0
  const pts = doneCnt.value + inProgressCnt.value * 0.5
  return Math.round((pts / totalCnt.value) * 100)
})

// % fill of track segment before phases[pi] — based on previous phase status
function trackFillPct(pi: number): number {
  const prev = phases.value[pi - 1]
  if (!prev) return 0
  if (prev.status === 'done') return 100
  if (prev.status === 'in_progress') return 60
  if (prev.status === 'partial') return 30
  return 0
}
</script>

<style scoped>
.art-root {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ── Header ── */
.art-header { display: flex; flex-direction: column; gap: 4px; }

.art-progress-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
}

.art-progress-track {
  flex: 1;
  height: 4px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border-radius: 2px;
  overflow: hidden;
}

.art-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #818cf8 0%, #34d399 100%);
  border-radius: 2px;
  transition: width .55s cubic-bezier(.4,0,.2,1);
  min-width: 0;
}

.art-pct {
  font-size: .64rem;
  font-weight: 600;
  color: var(--glass-text);
  opacity: .45;
  white-space: nowrap;
  min-width: 30px;
  text-align: right;
}

.art-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: .62rem;
  line-height: 1;
}
.art-sum-done  { color: #10b981; font-weight: 600; }
.art-sum-ip    { color: #f59e0b; font-weight: 600; }
.art-sum-total { color: var(--glass-text); opacity: .32; }

/* ── Stepper ── */
.art-stepper {
  display: flex;
  align-items: flex-start;
  gap: 0;
}

/* ── Track segment ── */
.art-track-seg {
  flex: 1;
  height: 2px;
  background: color-mix(in srgb, var(--glass-text) 9%, transparent);
  border-radius: 1px;
  margin-top: 14px;
  position: relative;
  overflow: hidden;
  min-width: 6px;
}

.art-track-fill {
  position: absolute;
  top: 0; bottom: 0; left: 0;
  background: linear-gradient(90deg, #34d399, #818cf8);
  border-radius: 1px;
  transition: width .55s cubic-bezier(.4,0,.2,1);
}

/* ── Step ── */
.art-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.art-step-node {
  position: relative;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--glass-text) 16%, transparent);
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background .2s, border-color .2s, box-shadow .2s;
  cursor: default;
}

/* Status variants */
.art-step--done .art-step-node {
  background: rgba(16,185,129,.14);
  border-color: rgba(16,185,129,.55);
}
.art-step--in_progress .art-step-node {
  background: rgba(245,158,11,.14);
  border-color: rgba(245,158,11,.6);
  box-shadow: 0 0 0 3px rgba(245,158,11,.09);
}
.art-step--partial .art-step-node {
  background: rgba(129,140,248,.1);
  border-color: rgba(129,140,248,.42);
}
.art-step--pending .art-step-node { opacity: .38; }
.art-step--skipped .art-step-node { opacity: .18; }

/* Icons */
.art-check-icon { width: 13px; height: 13px; color: #10b981; }

.art-ip-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f59e0b;
  display: block;
}

.art-partial-icon {
  font-size: .68rem;
  color: #818cf8;
  line-height: 1;
}

.art-num {
  font-size: .6rem;
  font-weight: 700;
  color: var(--glass-text);
  opacity: .45;
  line-height: 1;
}

/* Pulse ring */
.art-pulse {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 1.5px solid rgba(245,158,11,.3);
  animation: art-pulse-ring 2.2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes art-pulse-ring {
  0%   { opacity: .85; transform: scale(1); }
  55%  { opacity: 0;   transform: scale(1.6); }
  100% { opacity: 0;   transform: scale(1.6); }
}

/* Step labels */
.art-step-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.art-step-name {
  font-size: .54rem;
  color: var(--glass-text);
  opacity: .4;
  white-space: nowrap;
  text-align: center;
  max-width: 54px;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
  transition: opacity .2s;
}
.art-step--done .art-step-name,
.art-step--in_progress .art-step-name,
.art-step--partial .art-step-name { opacity: .68; }

.art-step-cnt {
  font-size: .52rem;
  color: var(--glass-text);
  opacity: .25;
  line-height: 1;
}
.art-step-cnt--done       { color: #10b981; opacity: .8; }
.art-step-cnt--in_progress { color: #f59e0b; opacity: .9; }
.art-step-cnt--partial    { color: #818cf8; opacity: .75; }
</style>
