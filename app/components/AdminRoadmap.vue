<template>
  <div class="arm-root">
    <!-- ── Visual progress tracker ── -->
    <div v-if="stages.length" class="arm-tracker">
      <div class="arm-tracker-bar">
        <div class="arm-tracker-fill" :style="{ width: progressPercent + '%' }" />
      </div>
      <div class="arm-tracker-nodes">
        <div
          v-for="(stage, idx) in stages"
          :key="stage.id || idx"
          class="arm-node"
          :class="`arm-node--${stage.status}`"
          :title="`${idx + 1}. ${stage.title || 'без названия'} — ${statusLabelText(stage.status)}`"
          @click="scrollToStage(idx)"
        >
          <span class="arm-node-icon">{{ stage.status === 'done' ? '✓' : stage.status === 'skipped' ? '—' : (idx + 1) }}</span>
        </div>
      </div>
      <div class="arm-progress-text">
        {{ doneCount }}/{{ stages.length }} выполнено
        <span v-if="inProgressCount" class="arm-ip-count">· {{ inProgressCount }} в работе</span>
      </div>
    </div>

    <!-- ── Header bar ── -->
    <div class="arm-header">
      <span class="arm-count">{{ stages.length }} этапов</span>
      <div class="arm-actions">
        <button class="arm-btn" @click="showTemplatePicker = true">📋 шаблон</button>
        <button class="arm-btn" @click="addStage">+ этап</button>
        <button class="arm-btn arm-btn--save" @click="save" :disabled="saving">
          {{ saving ? 'сохранение...' : 'сохранить' }}
        </button>
      </div>
    </div>

    <!-- ── Loading ── -->
    <div v-if="pending" class="arm-loading">Загрузка...</div>

    <template v-else>
      <div v-if="!stages.length" class="arm-empty">
        Этапов пока нет. Добавьте первый или выберите шаблон.
      </div>

      <!-- ── Stage cards ── -->
      <div class="arm-stages">
        <div
          v-for="(stage, idx) in stages"
          :key="stage.id || idx"
          :ref="el => { stageRefs[idx] = el as HTMLElement }"
          class="arm-card"
          :class="`arm-card--${stage.status}`"
        >
          <!-- Card header: number + status indicator -->
          <div class="arm-card-head">
            <div
              class="arm-card-num"
              :class="`arm-card-num--${stage.status}`"
              title="Кликни для смены статуса"
              style="cursor:pointer"
              @click="cycleStatus(stage)"
            >
              {{ stage.status === 'done' ? '✓' : stage.status === 'skipped' ? '—' : (idx + 1) }}
            </div>
            <div class="arm-card-title-wrap">
              <input
                v-model="stage.title"
                class="arm-input arm-input--title"
                placeholder="Название этапа"
              />
              <span v-if="stage.id && taskCountByStage[stage.id]" class="arm-task-badge">
                {{ taskCountByStage[stage.id] }} задач
              </span>
            </div>
            <span class="arm-status-chip" :class="`arm-status-chip--${stage.status}`" @click="cycleStatus(stage)">{{ statusLabelText(stage.status) }}</span>
            <div class="arm-card-actions">
              <button v-if="idx > 0" class="arm-icon-btn" title="Вверх" @click="moveStage(idx, -1)">↑</button>
              <button v-if="idx < stages.length - 1" class="arm-icon-btn" title="Вниз" @click="moveStage(idx, 1)">↓</button>
              <button class="arm-icon-btn arm-icon-btn--del" title="Удалить" @click="removeStage(idx)">✕</button>
            </div>
          </div>

          <!-- Card body: dates, scenario -->
          <div class="arm-card-body">
            <div class="arm-field">
              <label class="arm-label">Начало</label>
              <AppDatePicker v-model="stage.dateStart" model-type="iso" input-class="arm-input" />
            </div>
            <div class="arm-field">
              <label class="arm-label">Конец</label>
              <AppDatePicker v-model="stage.dateEnd" model-type="iso" input-class="arm-input" />
            </div>
            <div class="arm-field">
              <label class="arm-label">Сценарий</label>
              <select v-model="stage.stageKey" class="arm-input arm-input--select" @change="onScenarioChange(stage)">
                <option value="">— свой —</option>
                <option v-for="s in scenarioOptions" :key="s.key" :value="s.key">{{ s.label }}</option>
              </select>
            </div>
          </div>

          <div class="arm-card-description">
            <label class="arm-label">Описание этапа</label>
            <textarea
              v-model="stage.description"
              rows="2"
              placeholder="пункты и подпункты этапа..."
              class="arm-input arm-input--textarea"
            />
          </div>

          <!-- Notes -->
          <div class="arm-card-notes">
            <textarea v-model="stage.notes" rows="2" placeholder="заметки к этапу..." class="arm-input arm-input--textarea" />
          </div>
        </div>
      </div>

      <p v-if="error" class="arm-error">{{ error }}</p>
      <p v-if="savedMsg" class="arm-saved">{{ savedMsg }}</p>
    </template>
  </div>

  <!-- Template Picker Modal -->
  <Teleport to="body">
    <div v-if="showTemplatePicker" class="arm-backdrop" @click.self="closeTemplatePicker">
      <div class="arm-modal">
        <div class="arm-modal-head">
          <span>Выбрать шаблон дорожной карты</span>
          <button class="arm-modal-close" @click="closeTemplatePicker">✕</button>
        </div>
        <div v-if="templatesPending" class="arm-modal-loading">Загрузка шаблонов...</div>
        <template v-else>
          <div v-if="!previewTemplate" class="arm-modal-body">
            <div v-if="!allTemplates.length" class="arm-modal-empty">Шаблоны не найдены</div>
            <div v-for="tpl in allTemplates" :key="tpl.key" class="arm-tpl-item" @click="previewTemplate = tpl">
              <div class="arm-tpl-title">{{ tpl.title }}</div>
              <div class="arm-tpl-desc">{{ tpl.description }}</div>
              <div class="arm-tpl-count">{{ tpl.stages.length }} этапов</div>
            </div>
          </div>
          <div v-else class="arm-modal-body">
            <button class="arm-modal-back" @click="previewTemplate = null">← назад</button>
            <div class="arm-tpl-preview-title">{{ previewTemplate.title }}</div>
            <p class="arm-tpl-preview-desc">{{ previewTemplate.description }}</p>
            <div class="arm-tpl-stages">
              <div v-for="(s, i) in previewTemplate.stages" :key="i" class="arm-tpl-stage-row">
                <span class="arm-tpl-stage-num">{{ i + 1 }}</span>
                <div>
                  <div class="arm-tpl-stage-name">{{ s.title }}</div>
                  <div v-if="s.description" class="arm-tpl-stage-desc">{{ s.description }}</div>
                </div>
              </div>
            </div>
            <div class="arm-modal-footer">
              <span v-if="stages.length" class="arm-modal-warn">⚠ текущие этапы будут заменены</span>
              <button class="arm-btn arm-btn--save" @click="applyTemplate(previewTemplate)">применить шаблон</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { normalizeRoadmapStatus, roadmapStatusLabel } from '~~/shared/utils/roadmap'

const props = defineProps<{ slug: string }>()
const { notifySaved } = useRoadmapBus()

const scenarioOptions = [
  { key: 'brief', label: 'Бриф и замеры' },
  { key: 'concept', label: 'Концепция и планировка' },
  { key: 'design', label: 'Дизайн-проект' },
  { key: 'estimate', label: 'Смета и закупки' },
  { key: 'implementation', label: 'Реализация' },
  { key: 'handover', label: 'Сдача объекта' },
]
const scenarioMap = Object.fromEntries(scenarioOptions.map(s => [s.key, s.label]))

function statusLabelText(status: string) {
  return roadmapStatusLabel(status)
}

function cycleStatus(stage: any) {
  const order = ['pending', 'in_progress', 'done', 'skipped']
  const cur = normalizeRoadmapStatus(stage.status)
  const idx = order.indexOf(cur)
  stage.status = order[(idx + 1) % order.length]
}

// ── Data fetching ──
const { data: roadmapData, pending } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/roadmap`
)
const { data: workStatusData } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/work-status`, { server: false, default: () => [] }
)

const taskCountByStage = computed(() => {
  const counts: Record<number, number> = {}
  for (const item of workStatusData.value || []) {
    if (item.roadmapStageId) {
      counts[item.roadmapStageId] = (counts[item.roadmapStageId] || 0) + 1
    }
  }
  return counts
})

// ── Local state ──
const stages = ref<any[]>([])
const stageRefs = ref<Record<number, HTMLElement | null>>({})
const saving = ref(false)
const error = ref('')
const savedMsg = ref('')

watch(roadmapData, (value) => {
  stages.value = (value || []).map((stage: any) => ({
    ...stage,
    status: normalizeRoadmapStatus(stage?.status),
  }))
}, { immediate: true })

// ── Progress computeds ──
const doneCount = computed(() => stages.value.filter(s => s.status === 'done').length)
const inProgressCount = computed(() => stages.value.filter(s => s.status === 'in_progress').length)
const progressPercent = computed(() => {
  if (!stages.value.length) return 0
  const done = doneCount.value
  const ip = inProgressCount.value
  return Math.round(((done + ip * 0.5) / stages.value.length) * 100)
})

// ── Template picker ──
const showTemplatePicker = ref(false)
const previewTemplate = ref<any>(null)

const { data: allTemplates, pending: templatesPending } = useFetch<any[]>(
  '/api/roadmap-templates',
  { server: false, default: () => [] }
)

function closeTemplatePicker() {
  showTemplatePicker.value = false
  previewTemplate.value = null
}

function applyTemplate(tpl: any) {
  stages.value = tpl.stages.map((s: any) => ({
    stageKey: s.stageKey || '',
    title: s.title,
    description: s.description || '',
    status: 'pending',
    dateStart: null,
    dateEnd: null,
    notes: s.notes || '',
  }))
  closeTemplatePicker()
}

// ── Stage operations ──
function addStage() {
  stages.value.push({
    stageKey: '',
    title: '',
    description: '',
    status: 'pending',
    dateStart: null,
    dateEnd: null,
    notes: '',
  })
  nextTick(() => scrollToStage(stages.value.length - 1))
}

function removeStage(idx: number) {
  stages.value.splice(idx, 1)
}

function moveStage(idx: number, dir: number) {
  const target = idx + dir
  if (target < 0 || target >= stages.value.length) return
  const arr = [...stages.value]
  ;[arr[idx], arr[target]] = [arr[target], arr[idx]]
  stages.value = arr
}

function scrollToStage(idx: number) {
  nextTick(() => {
    const el = stageRefs.value[idx]
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

function onScenarioChange(stage: any) {
  const title = scenarioMap[stage.stageKey]
  if (title && !stage.title) stage.title = title
}

// ── Save ──
async function save() {
  saving.value = true
  error.value = ''
  savedMsg.value = ''
  try {
    const updated = await $fetch<any[]>(`/api/projects/${props.slug}/roadmap`, {
      method: 'PUT',
      body: {
        stages: stages.value.map((stage: any, index: number) => ({
          ...stage,
          status: normalizeRoadmapStatus(stage?.status),
          sortOrder: index,
        }))
      }
    })
    if (Array.isArray(updated)) {
      stages.value = updated.map((stage: any) => ({
        ...stage,
        status: normalizeRoadmapStatus(stage?.status),
      }))
    }
    savedMsg.value = '✓ сохранено'
    notifySaved()
    setTimeout(() => { savedMsg.value = '' }, 3000)
  } catch (e: any) {
    error.value = e.data?.message || e.message || 'Ошибка сохранения'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.arm-root { }

/* ── Visual progress tracker ── */
.arm-tracker {
  margin-bottom: 20px;
  padding: 16px 20px;
  background: var(--glass-bg);
  border-radius: 14px;
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
}
.arm-tracker-bar {
  height: 4px;
  background: color-mix(in srgb, var(--glass-text) 10%, transparent);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 12px;
}
.arm-tracker-fill {
  height: 100%;
  background: #15803d;
  border-radius: 2px;
  transition: width .4s ease;
}
.arm-tracker-nodes {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 8px;
}
.arm-node {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .65rem; font-weight: 700; cursor: pointer;
  transition: all .2s; border: 2px solid transparent; flex-shrink: 0;
  color: var(--glass-text);
  background: color-mix(in srgb, var(--glass-text) 6%, transparent);
  opacity: .4;
}
.arm-node--done { background: rgba(34,197,94,.15); color: #15803d; border-color: #15803d; opacity: 1; }
.arm-node--in_progress { background: rgba(245,158,11,.12); color: #a16207; border-color: #f59e0b; opacity: 1; animation: arm-pulse 2s ease-in-out infinite; }
.arm-node--skipped { opacity: .25; text-decoration: line-through; }
.arm-node--pending { opacity: .4; }
.arm-node:hover { opacity: 1; transform: scale(1.15); }
.arm-node-icon { line-height: 1; }

@keyframes arm-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245,158,11,.3); }
  50% { box-shadow: 0 0 0 6px rgba(245,158,11,0); }
}

.arm-progress-text { font-size: .72rem; color: var(--glass-text); opacity: .55; }
.arm-ip-count { color: #a16207; opacity: 1; }

/* ── Header ── */
.arm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.arm-count { font-size: .78rem; color: var(--glass-text); opacity: .5; }
.arm-actions { display: flex; gap: 8px; }

.arm-btn {
  border: none;
  background: color-mix(in srgb, var(--glass-bg) 90%, transparent);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  padding: 6px 14px; font-size: .78rem; cursor: pointer;
  font-family: inherit; border-radius: 8px;
  color: var(--glass-text); opacity: .7; transition: opacity .15s;
}
.arm-btn:hover { opacity: 1; }
.arm-btn--save {
  background: var(--glass-text); color: var(--glass-page-bg);
  opacity: 1; font-weight: 500; border-radius: 8px; padding: 8px 20px;
}
.arm-btn--save:hover { opacity: .85; }
.arm-btn--save:disabled { opacity: .4; cursor: default; }

/* ── Loading / empty ── */
.arm-loading, .arm-empty { font-size: .84rem; color: var(--glass-text); opacity: .4; padding: 16px 0; }

/* ── Stage cards ── */
.arm-stages { display: flex; flex-direction: column; gap: 8px; }
.arm-card {
  background: var(--glass-bg);
  backdrop-filter: blur(18px) saturate(140%); -webkit-backdrop-filter: blur(18px) saturate(140%);
  border-radius: 12px; padding: 14px 16px;
  border-left: 3px solid transparent; transition: border-color .2s;
}
.arm-card--done { border-left-color: #15803d; }
.arm-card--in_progress { border-left-color: #f59e0b; }
.arm-card--skipped { opacity: .55; }
.arm-card--pending { border-left-color: color-mix(in srgb, var(--glass-text) 12%, transparent); }

.arm-card-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.arm-card-num {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: .68rem; font-weight: 700; flex-shrink: 0;
  background: color-mix(in srgb, var(--glass-text) 8%, transparent);
  color: var(--glass-text); opacity: .5;
}
.arm-card-num--done { background: rgba(34,197,94,.15); color: #15803d; opacity: 1; }
.arm-card-num--in_progress { background: rgba(245,158,11,.12); color: #a16207; opacity: 1; }
.arm-card-num--skipped { background: color-mix(in srgb, var(--glass-text) 8%, transparent); color: var(--glass-text); opacity: .45; }

/* Status chip */
.arm-status-chip {
  font-size: .62rem; font-weight: 600; padding: 2px 8px;
  border-radius: 999px; cursor: pointer; white-space: nowrap;
  transition: opacity .15s;
  margin-right: auto;
}
.arm-status-chip:hover { opacity: .75; }
.arm-status-chip--pending { color: var(--glass-text); background: color-mix(in srgb, var(--glass-text) 9%, transparent); opacity: .55; }
.arm-status-chip--in_progress { color: #a16207; background: rgba(245,158,11,.12); }
.arm-status-chip--done { color: #15803d; background: rgba(34,197,94,.13); }
.arm-status-chip--skipped { color: var(--glass-text); background: color-mix(in srgb, var(--glass-text) 8%, transparent); opacity: .45; }

.arm-card-title-wrap { flex: 1; display: flex; align-items: center; gap: 8px; min-width: 0; }
.arm-task-badge {
  white-space: nowrap; font-size: .66rem; font-weight: 700;
  padding: 2px 8px; border-radius: 10px;
  background: rgba(100,110,200,.12); color: rgba(80,90,180,1); flex-shrink: 0;
}
.arm-card-actions { display: flex; gap: 4px; flex-shrink: 0; }
.arm-icon-btn {
  width: 24px; height: 24px; border: none; background: none;
  cursor: pointer; font-size: .72rem; color: var(--glass-text); opacity: .3;
  border-radius: 4px; display: flex; align-items: center; justify-content: center;
  font-family: inherit; transition: opacity .15s, background .15s;
}
.arm-icon-btn:hover { opacity: .7; background: color-mix(in srgb, var(--glass-text) 6%, transparent); }
.arm-icon-btn--del:hover { color: var(--ds-error, #dc2626); opacity: .8; }

.arm-card-body { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 8px; }
@media (max-width: 768px) { .arm-card-body { grid-template-columns: repeat(2, 1fr); } }

.arm-card-description {
  margin-bottom: 8px;
}

.arm-field { display: flex; flex-direction: column; gap: 3px; }
.arm-label { font-size: .66rem; text-transform: uppercase; letter-spacing: .4px; color: var(--glass-text); opacity: .4; }

/* ── Inputs ── */
.arm-input {
  display: block; width: 100%; box-sizing: border-box; border: none;
  background: color-mix(in srgb, var(--glass-text) 4%, transparent);
  padding: 7px 10px; font-size: .82rem; font-family: inherit;
  color: var(--glass-text); border-radius: 6px; outline: none; transition: background .15s;
}
.arm-input:focus { background: color-mix(in srgb, var(--glass-text) 8%, transparent); }
.arm-input--title { font-weight: 500; font-size: .88rem; background: transparent; padding: 4px 0; }
.arm-input--title:focus { background: color-mix(in srgb, var(--glass-text) 4%, transparent); padding: 4px 8px; border-radius: 6px; }
.arm-input--select { appearance: none; -webkit-appearance: none; cursor: pointer; }
.arm-input--textarea { resize: none; font-size: .78rem; }

/* ── Messages ── */
.arm-error { color: var(--ds-error, #dc2626); font-size: .78rem; margin-top: 8px; }
.arm-saved { color: #15803d; font-size: .78rem; margin-top: 8px; }

/* ── Template picker modal ── */
.arm-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,.4);
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 200;
}
.arm-modal {
  background: var(--glass-bg);
  backdrop-filter: blur(20px) saturate(140%); -webkit-backdrop-filter: blur(20px) saturate(140%);
  border-radius: 14px; width: 480px; max-width: 95vw; max-height: 80vh;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 12px 48px rgba(0,0,0,.18);
}
.arm-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid color-mix(in srgb, var(--glass-text) 8%, transparent);
  font-size: .84rem; font-weight: 500; color: var(--glass-text);
}
.arm-modal-close {
  background: none; border: none; cursor: pointer;
  font-size: 1rem; color: var(--glass-text); opacity: .5; padding: 2px 6px;
}
.arm-modal-close:hover { opacity: 1; }
.arm-modal-loading, .arm-modal-empty { padding: 32px; text-align: center; font-size: .82rem; color: var(--glass-text); opacity: .45; }
.arm-modal-body { overflow-y: auto; flex: 1; padding: 12px 16px; }
.arm-modal-back { background: none; border: none; cursor: pointer; font-size: .78rem; color: var(--glass-text); opacity: .5; padding: 0; margin-bottom: 12px; font-family: inherit; }
.arm-modal-back:hover { opacity: 1; }
.arm-modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding-top: 12px; }
.arm-modal-warn { font-size: .75rem; color: #e08a2f; }

.arm-tpl-item { padding: 10px 12px; border-radius: 8px; cursor: pointer; margin-bottom: 4px; transition: background .15s; }
.arm-tpl-item:hover { background: color-mix(in srgb, var(--glass-text) 5%, transparent); }
.arm-tpl-title { font-size: .84rem; font-weight: 500; margin-bottom: 2px; color: var(--glass-text); }
.arm-tpl-desc { font-size: .74rem; color: var(--glass-text); opacity: .5; margin-bottom: 2px; }
.arm-tpl-count { font-size: .7rem; color: var(--glass-text); opacity: .35; }

.arm-tpl-preview-title { font-size: .9rem; font-weight: 600; margin-bottom: 6px; color: var(--glass-text); }
.arm-tpl-preview-desc { font-size: .78rem; color: var(--glass-text); opacity: .5; margin-bottom: 14px; }
.arm-tpl-stages { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.arm-tpl-stage-row {
  display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px;
  border-radius: 8px; background: color-mix(in srgb, var(--glass-text) 3%, transparent);
}
.arm-tpl-stage-num { min-width: 20px; font-size: .75rem; color: var(--glass-text); opacity: .4; padding-top: 1px; }
.arm-tpl-stage-name { font-size: .83rem; font-weight: 500; color: var(--glass-text); }
.arm-tpl-stage-desc { font-size: .73rem; color: var(--glass-text); opacity: .5; margin-top: 2px; }

.dark .arm-task-badge { background: rgba(130,145,255,.15); color: rgba(160,170,255,1); }
</style>
