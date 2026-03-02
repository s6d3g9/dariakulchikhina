<template>
  <div class="art-root">
    <!-- Progress bar -->
    <div class="art-bar-track">
      <div class="art-bar-fill" :style="{ width: progressPct + '%' }" />
      <div class="art-bar-label">{{ doneCnt }}&thinsp;/&thinsp;{{ totalCnt }} этапов</div>
    </div>

    <!-- Phase timeline -->
    <div class="art-timeline">
      <template v-for="(phase, pi) in phases" :key="phase.key">
        <!-- Connector line between phases -->
        <div
          v-if="pi > 0"
          class="art-connector"
          :class="{ 'art-connector--done': phases[pi - 1].status === 'done' || phases[pi - 1].status === 'in_progress' }"
        />

        <!-- Phase node -->
        <div class="art-node-wrap">
          <div
            class="art-node"
            :class="`art-node--${phase.status}`"
            :title="`${phase.label}: ${phase.done}/${phase.total} выполнено`"
          >
            <span class="art-node-icon">{{ nodeIcon(phase.status) }}</span>
            <span v-if="phase.status === 'in_progress'" class="art-node-pulse" />
          </div>
          <div class="art-node-label">{{ phase.short }}</div>

          <!-- Stage dots under the phase -->
          <div v-if="phase.total > 1" class="art-stage-dots">
            <span
              v-for="(s, si) in phase.stages"
              :key="si"
              class="art-sdot"
              :class="`art-sdot--${normalizeStatus(s.status)}`"
              :title="s.title || `этап ${si + 1}`"
            />
          </div>
          <div v-if="phase.total > 0" class="art-node-cnt">
            <span :class="phase.status === 'done' ? 'art-cnt--done' : phase.status === 'in_progress' ? 'art-cnt--active' : ''">
              {{ phase.done }}/{{ phase.total }}
            </span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { normalizeRoadmapStatus, roadmapPhaseFromStageKey } from '~~/shared/utils/roadmap'

const props = defineProps<{
  stages: Array<{ stageKey?: string | null; status?: string | null; title?: string | null }>
}>()

const PHASE_ORDER = ['lead', 'concept', 'working_project', 'procurement', 'construction', 'commissioning']
const PHASE_FALLBACK = PHASE_ORDER

const PHASE_LABELS: Record<string, { label: string; short: string }> = {
  lead:            { label: 'Инициация',        short: 'Инициация' },
  concept:         { label: 'Концепция',         short: 'Концепция' },
  working_project: { label: 'Рабочий проект',    short: 'Проект' },
  procurement:     { label: 'Закупки',           short: 'Закупки' },
  construction:    { label: 'Строительство',     short: 'Стройка' },
  commissioning:   { label: 'Сдача',             short: 'Сдача' },
}

function normalizeStatus(s: string | null | undefined) {
  return normalizeRoadmapStatus(s)
}

function phaseStatus(stagesArr: any[]): string {
  const sts = stagesArr.map(s => normalizeRoadmapStatus(s.status))
  if (sts.every(s => s === 'done' || s === 'skipped')) return 'done'
  if (sts.some(s => s === 'in_progress')) return 'in_progress'
  if (sts.some(s => s === 'done')) return 'partial'
  return 'pending'
}

const phases = computed(() => {
  if (!props.stages?.length) return []
  const map: Record<string, any[]> = {}
  PHASE_ORDER.forEach(k => { map[k] = [] })

  props.stages.forEach((stage, idx) => {
    const phKey = roadmapPhaseFromStageKey(stage.stageKey) || PHASE_FALLBACK[idx] || 'lead'
    if (!map[phKey]) map[phKey] = []
    map[phKey].push(stage)
  })

  return PHASE_ORDER
    .filter(k => map[k]?.length)
    .map(k => {
      const arr = map[k]
      const st = phaseStatus(arr)
      const done = arr.filter(s => {
        const ns = normalizeRoadmapStatus(s.status)
        return ns === 'done' || ns === 'skipped'
      }).length
      return {
        key: k,
        label: PHASE_LABELS[k]?.label ?? k,
        short: PHASE_LABELS[k]?.short ?? k,
        total: arr.length,
        done,
        status: st,
        stages: arr,
      }
    })
})

const totalCnt = computed(() => props.stages?.length ?? 0)
const doneCnt = computed(() =>
  (props.stages ?? []).filter(s => {
    const ns = normalizeRoadmapStatus(s.status)
    return ns === 'done' || ns === 'skipped'
  }).length
)
const progressPct = computed(() => {
  if (!totalCnt.value) return 0
  let pts = 0
  for (const s of props.stages ?? []) {
    const ns = normalizeRoadmapStatus(s.status)
    if (ns === 'done' || ns === 'skipped') pts++
    else if (ns === 'in_progress') pts += 0.5
  }
  return Math.round((pts / totalCnt.value) * 100)
})

function nodeIcon(status: string) {
  if (status === 'done') return '✓'
  if (status === 'in_progress' || status === 'partial') return '◉'
  return ''
}
</script>

<style scoped>
.art-root {
  margin-top: 10px;
}

/* ── Progress bar ── */
.art-bar-track {
  position: relative;
  height: 3px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border-radius: 2px;
  margin-bottom: 14px;
  overflow: visible;
}
.art-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1 0%, #10b981 100%);
  border-radius: 2px;
  transition: width .5s ease;
  min-width: 2px;
}
.art-bar-label {
  position: absolute;
  right: 0;
  top: -18px;
  font-size: .62rem;
  color: var(--glass-text);
  opacity: .38;
  white-space: nowrap;
}

/* ── Timeline row ── */
.art-timeline {
  display: flex;
  align-items: flex-start;
  gap: 0;
}

/* ── Connector line ── */
.art-connector {
  flex: 1;
  height: 1.5px;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  margin-top: 13px;
  transition: background .3s;
  min-width: 4px;
}
.art-connector--done {
  background: linear-gradient(90deg, rgba(16,185,129,.4), rgba(99,102,241,.3));
}

/* ── Phase node ── */
.art-node-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 36px;
}

.art-node {
  position: relative;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid color-mix(in srgb, var(--glass-text) 18%, transparent);
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all .25s;
  flex-shrink: 0;
  cursor: default;
}

.art-node--done {
  background: rgba(16,185,129,.13);
  border-color: rgba(16,185,129,.55);
}
.art-node--in_progress {
  background: rgba(245,158,11,.13);
  border-color: rgba(245,158,11,.6);
  box-shadow: 0 0 0 3px rgba(245,158,11,.08);
}
.art-node--partial {
  background: rgba(99,102,241,.1);
  border-color: rgba(99,102,241,.4);
}
.art-node--pending {
  opacity: .45;
}
.art-node--skipped {
  opacity: .25;
}

.art-node-icon {
  font-size: .6rem;
  font-weight: 700;
  line-height: 1;
  color: var(--glass-text);
}
.art-node--done     .art-node-icon { color: #10b981; }
.art-node--in_progress .art-node-icon { color: #d97706; }
.art-node--partial  .art-node-icon { color: #6366f1; }

/* Pulse ring for in_progress */
.art-node-pulse {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 1.5px solid rgba(245,158,11,.3);
  animation: art-ring 2s ease-in-out infinite;
  pointer-events: none;
}

@keyframes art-ring {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0; transform: scale(1.45); }
}

.art-node-label {
  font-size: .55rem;
  color: var(--glass-text);
  opacity: .4;
  white-space: nowrap;
  text-align: center;
  max-width: 52px;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

/* ── Stage dots ── */
.art-stage-dots {
  display: flex;
  gap: 2px;
  flex-wrap: wrap;
  justify-content: center;
  max-width: 52px;
}
.art-sdot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--glass-text) 15%, transparent);
  transition: background .2s;
}
.art-sdot--done     { background: rgba(16,185,129,.55); }
.art-sdot--in_progress { background: rgba(245,158,11,.7); }
.art-sdot--partial  { background: rgba(99,102,241,.5); }
.art-sdot--skipped  { opacity: .2; }
.art-sdot--pending  { opacity: .3; }

/* ── Count ── */
.art-node-cnt {
  font-size: .58rem;
  color: var(--glass-text);
  opacity: .35;
  white-space: nowrap;
}
.art-cnt--done   { color: #10b981; opacity: 1; }
.art-cnt--active { color: #d97706; opacity: 1; }
</style>
