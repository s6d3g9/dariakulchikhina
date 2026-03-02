<template>
  <div class="apf-wrap glass-surface">
    <!-- Progress bar -->
    <div class="apf-bar">
      <div class="apf-fill" :style="{ width: fillPct + '%' }" />
    </div>

    <!-- Phase pills -->
    <div class="apf-phases">
      <button
        v-for="ph in PHASES"
        :key="ph.key"
        class="apf-pill"
        :class="pillClass(ph.key)"
        :title="ph.desc"
        @click="setPhase(ph.key)"
      >
        <span class="apf-pill-num">{{ ph.short }}</span>
        <span class="apf-pill-label">{{ ph.label }}</span>
        <span v-if="ph.key !== 'completed'" class="apf-pill-count">
          {{ stageStats[ph.key]?.done ?? 0 }}/{{ stageStats[ph.key]?.total ?? 0 }}
        </span>
      </button>
    </div>

    <!-- Bottom meta -->
    <div class="apf-meta">
      <span class="apf-total">
        {{ totalDone }}/{{ totalStages }} этапов выполнено
      </span>
      <span v-if="savingStatus" class="apf-saving">сохранение...</span>
      <span v-else-if="savedOk" class="apf-saved">✓ сохранено</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { normalizeRoadmapStatus, roadmapPhaseFromStageKey } from '~~/shared/utils/roadmap'

const props = defineProps<{ slug: string; status: string }>()
const emit = defineEmits<{ (e: 'update:status', v: string): void }>()

const { lastSaved } = useRoadmapBus()

// ── Конфиг фаз ──────────────────────────────────────────────────
const PHASES = [
  { key: 'lead',            short: '0', label: 'Инициация',      desc: 'Бриф, замеры, договор',             color: '#6366f1' },
  { key: 'concept',         short: '1', label: 'Концепция',       desc: 'Планировки, мудборд',               color: '#8b5cf6' },
  { key: 'working_project', short: '2', label: 'Рабочий',         desc: 'Чертежи, спецификации, инженерия',  color: '#3b82f6' },
  { key: 'procurement',     short: '3', label: 'Закупки',         desc: 'Смета, поставщики',                 color: '#f59e0b' },
  { key: 'construction',    short: '4', label: 'Стройка',         desc: 'Авторский надзор',                  color: '#f97316' },
  { key: 'commissioning',   short: '5', label: 'Сдача',           desc: 'Дефектовка, акт',                   color: '#10b981' },
  { key: 'completed',       short: '✓', label: 'Завершён',        desc: 'Проект закрыт',                     color: '#14b8a6' },
]

const PHASE_BY_IDX = ['lead','concept','working_project','procurement','construction','commissioning']

// ── Данные роадмапа ──────────────────────────────────────────────
const { data: roadmapStages, refresh } = useFetch<any[]>(
  () => `/api/projects/${props.slug}/roadmap`,
  { server: false, default: () => [] },
)

// Пересчитать после сохранения из AdminRoadmap
watch(lastSaved, () => refresh())

// ── Статистика по фазам ──────────────────────────────────────────
const stageStats = computed(() => {
  const stats: Record<string, { done: number; inProgress: number; total: number }> = {}
  PHASES.forEach(ph => { stats[ph.key] = { done: 0, inProgress: 0, total: 0 } })

  const sorted = [...(roadmapStages.value || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  sorted.forEach((stage, idx) => {
    const phKey = roadmapPhaseFromStageKey(stage.stageKey) || PHASE_BY_IDX[idx] || 'lead'
    if (!stats[phKey]) return
    stats[phKey].total++
    const st = normalizeRoadmapStatus(stage.status)
    if (st === 'done' || st === 'skipped') stats[phKey].done++
    if (st === 'in_progress') stats[phKey].inProgress++
  })
  return stats
})

const totalStages = computed(() =>
  Object.values(stageStats.value).reduce((s, v) => s + v.total, 0)
)
const totalDone = computed(() =>
  Object.values(stageStats.value).reduce((s, v) => s + v.done, 0)
)
// Бар двигается по позиции фазы (0→0%, lead→~8%, ..., completed→100%)
// + небольшая прибавка если внутри фазы есть выполненные этапы
const fillPct = computed(() => {
  const mainPhases = PHASES.filter(p => p.key !== 'completed')
  const idx = mainPhases.findIndex(p => p.key === currentKey.value)
  if (currentKey.value === 'completed') return 100
  if (idx < 0) return 0
  // каждая фаза = 100/6 ≈ 16.67%
  const perPhase = 100 / mainPhases.length
  const base = idx * perPhase
  // прибавка за выполненные этапы внутри текущей фазы
  const s = stageStats.value[currentKey.value]
  const extra = (s && s.total > 0) ? (s.done / s.total) * perPhase : 0
  return Math.round(base + extra)
})

// ── Текущий статус проекта ────────────────────────────────────────
const currentKey = ref(props.status || 'lead')
watch(() => props.status, v => { if (v) currentKey.value = v })

const { notifySaved } = useRoadmapBus()

function phaseOrder(key: string) { return PHASES.findIndex(p => p.key === key) }

function pillClass(key: string) {
  const order = phaseOrder(key)
  const current = phaseOrder(currentKey.value)
  const stats = stageStats.value[key]

  if (key === currentKey.value) return 'apf-pill--active'
  if (order < current) return 'apf-pill--done'
  if (stats?.inProgress) return 'apf-pill--progress'
  if (stats?.done && stats.done < stats.total) return 'apf-pill--partial'
  if (stats?.done === stats?.total && stats?.total > 0) return 'apf-pill--all-done'
  return 'apf-pill--future'
}

// ── Сохранение статуса ───────────────────────────────────────────
const savingStatus = ref(false)
const savedOk = ref(false)

async function setPhase(key: string) {
  if (savingStatus.value || key === currentKey.value) return
  currentKey.value = key
  savingStatus.value = true
  savedOk.value = false
  try {
    await $fetch(`/api/projects/${props.slug}`, { method: 'PUT', body: { status: key } })
    emit('update:status', key)
    notifySaved()
    savedOk.value = true
    setTimeout(() => { savedOk.value = false }, 2500)
  } catch (e) { console.error(e) }
  finally { savingStatus.value = false }
}
</script>

<style scoped>
.apf-wrap {
  border-radius: 14px;
  padding: 12px 16px 10px;
  margin-bottom: 18px;
}

/* ── Прогресс-бар ── */
.apf-bar {
  height: 3px;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}
.apf-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1 0%, #10b981 100%);
  border-radius: 2px;
  transition: width .5s ease;
}

/* ── Фазы ── */
.apf-phases {
  display: flex;
  gap: 4px;
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
  margin-bottom: 8px;
}
.apf-phases::-webkit-scrollbar { display: none; }

.apf-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  border: none;
  background: color-mix(in srgb, var(--glass-text) 5%, transparent);
  color: var(--glass-text);
  border-radius: 10px;
  padding: 7px 10px 6px;
  cursor: pointer;
  font-family: inherit;
  opacity: .42;
  flex: 1;
  min-width: 60px;
  transition: opacity .15s, background .15s, transform .1s;
  position: relative;
}
.apf-pill:hover { opacity: .75; transform: translateY(-1px); }

.apf-pill-num {
  font-size: .72rem;
  font-weight: 700;
  line-height: 1;
}
.apf-pill-label {
  font-size: .6rem;
  letter-spacing: .2px;
  white-space: nowrap;
  line-height: 1;
}
.apf-pill-count {
  font-size: .58rem;
  opacity: .6;
  line-height: 1;
}

/* ── Состояния пилов ── */
.apf-pill--active {
  background: #6366f1;
  color: #fff;
  opacity: 1;
  box-shadow: 0 2px 12px rgba(99,102,241,.35);
}
.apf-pill--done {
  background: rgba(22,163,74,.12);
  color: #16a34a;
  opacity: 1;
}
.apf-pill--done .apf-pill-num::after { content: ' ✓'; font-size: .58rem; }
.apf-pill--progress {
  background: rgba(245,158,11,.12);
  color: #a16207;
  opacity: 1;
}
.apf-pill--partial {
  opacity: .65;
}
.apf-pill--all-done {
  background: rgba(22,163,74,.08);
  opacity: .8;
}
.apf-pill--future { opacity: .32; }

/* ── Мета-строка ── */
.apf-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: .7rem;
}
.apf-total { color: var(--glass-text); opacity: .45; }
.apf-saving { color: var(--glass-text); opacity: .4; font-style: italic; }
.apf-saved { color: #16a34a; }

/* Тёмная тема */
html.dark .apf-pill--active { background: #4f46e5; }
html.dark .apf-pill--done   { background: rgba(74,222,128,.12); color: #4ade80; }
html.dark .apf-fill { background: linear-gradient(90deg, #818cf8 0%, #34d399 100%); }
</style>
