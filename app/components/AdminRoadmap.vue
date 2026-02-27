<template>
  <div class="glass-card p-3">
    <div class="flex items-center justify-between mb-4">
      <span class="text-sm text-gray-600 dark:text-gray-300">{{ stages.length }} этапов</span>
      <div class="flex gap-2">
        <button class="a-btn-sm" @click="showTemplatePicker = true">📋 шаблон</button>
        <button class="a-btn-sm" @click="addStage">+ добавить этап</button>
        <button class="a-btn-save" @click="save" :disabled="saving">{{ saving ? '...' : 'сохранить' }}</button>
      </div>
    </div>

    <div v-if="pending" class="text-sm text-gray-500 dark:text-gray-300">Загрузка...</div>
    <template v-else>
      <div v-if="!stages.length" class="text-xs text-gray-500 dark:text-gray-300 mb-3">Этапов пока нет. Добавьте первый этап или выберите шаблон.</div>

      <div class="grid gap-3">
        <div
          v-for="(stage, idx) in stages"
          :key="idx"
          class="glass-surface rounded-xl border border-white/50 dark:border-white/10 p-4"
        >
          <div class="grid grid-cols-3 gap-3 mb-2">
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-300 block mb-1">Сценарий</label>
              <select v-model="stage.stageKey" class="w-full glass-input rounded-md px-2 py-2 text-sm outline-none" @change="onScenarioChange(stage)">
                <option value="">свой</option>
                <option v-for="s in scenarioOptions" :key="s.key" :value="s.key">{{ s.label }}</option>
              </select>
            </div>
            <div class="col-span-2">
              <label class="text-xs text-gray-500 dark:text-gray-300 block mb-1">Название этапа</label>
              <input v-model="stage.title" class="w-full glass-input rounded-md px-2 py-2 text-sm outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-3 gap-3 mb-2">
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-300 block mb-1">Статус</label>
              <select v-model="stage.status" class="w-full glass-input rounded-md px-2 py-2 text-sm outline-none">
                <option value="pending">ожидание</option>
                <option value="in_progress">в работе</option>
                <option value="done">выполнено</option>
                <option value="skipped">пропущено</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-300 block mb-1">Начало</label>
              <AppDatePicker
                v-model="stage.dateStart"
                input-class="w-full glass-input rounded-md px-2 py-2 text-sm outline-none"
              />
            </div>
            <div>
              <label class="text-xs text-gray-500 dark:text-gray-300 block mb-1">Конец</label>
              <AppDatePicker
                v-model="stage.dateEnd"
                input-class="w-full glass-input rounded-md px-2 py-2 text-sm outline-none"
              />
            </div>
          </div>

          <div class="mt-2">
            <textarea
              v-model="stage.notes"
              rows="2"
              placeholder="заметки..."
              class="w-full glass-input rounded-md px-2 py-2 text-xs outline-none resize-none"
            />
          </div>

          <div class="flex justify-end mt-2">
            <button class="text-xs text-red-400 hover:text-red-500" @click="removeStage(idx)">удалить</button>
          </div>
        </div>
      </div>

      <p v-if="error" class="text-red-500 text-xs mt-2">{{ error }}</p>
    </template>
  </div>

  <!-- Template Picker Modal -->
  <Teleport to="body">
    <div v-if="showTemplatePicker" class="rm-backdrop" @click.self="closeTemplatePicker">
      <div class="rm-modal">
        <div class="rm-header">
          <span>Выбрать шаблон дорожной карты</span>
          <button class="rm-close" @click="closeTemplatePicker">✕</button>
        </div>

        <div v-if="templatesPending" class="rm-loading">Загрузка шаблонов...</div>
        <template v-else>
          <!-- Step 1: choose template -->
          <div v-if="!previewTemplate" class="rm-body">
            <div v-if="!allTemplates.length" class="rm-empty">Шаблоны не найдены</div>
            <div
              v-for="tpl in allTemplates"
              :key="tpl.key"
              class="rm-tpl-item"
              :class="{ 'rm-tpl-item--selected': hoveredKey === tpl.key }"
              @mouseenter="hoveredKey = tpl.key"
              @mouseleave="hoveredKey = ''"
              @click="previewTemplate = tpl"
            >
              <div class="rm-tpl-title">{{ tpl.title }}</div>
              <div class="rm-tpl-desc">{{ tpl.description }}</div>
              <div class="rm-tpl-stages">{{ tpl.stages.length }} этапов</div>
            </div>
          </div>

          <!-- Step 2: preview + confirm -->
          <div v-else class="rm-body">
            <button class="rm-back" @click="previewTemplate = null">← назад</button>
            <div class="rm-preview-title">{{ previewTemplate.title }}</div>
            <p class="rm-preview-desc">{{ previewTemplate.description }}</p>
            <div class="rm-stage-list">
              <div v-for="(s, i) in previewTemplate.stages" :key="i" class="rm-stage-row">
                <span class="rm-stage-num">{{ i + 1 }}</span>
                <div>
                  <div class="rm-stage-name">{{ s.title }}</div>
                  <div v-if="s.description" class="rm-stage-subdesc">{{ s.description }}</div>
                </div>
              </div>
            </div>
            <div class="rm-footer">
              <span v-if="stages.length" class="rm-warn">⚠ текущие этапы будут заменены</span>
              <button class="a-btn-save rm-apply" @click="applyTemplate(previewTemplate)">применить шаблон</button>
            </div>
          </div>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const scenarioOptions = [
  { key: 'brief', label: 'Бриф и замеры' },
  { key: 'concept', label: 'Концепция и планировка' },
  { key: 'design', label: 'Дизайн-проект' },
  { key: 'estimate', label: 'Смета и закупки' },
  { key: 'implementation', label: 'Реализация' },
  { key: 'handover', label: 'Сдача объекта' },
]

const scenarioMap = Object.fromEntries(scenarioOptions.map(s => [s.key, s.label]))

const { data: roadmapData, pending } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/roadmap`
)

const stages = ref<any[]>([])
const saving = ref(false)
const error = ref('')

watch(roadmapData, (value) => {
  stages.value = (value || []).map((stage: any) => ({ ...stage }))
}, { immediate: true })

// --- Template picker ---
const showTemplatePicker = ref(false)
const previewTemplate = ref<any>(null)
const hoveredKey = ref('')

const { data: allTemplates, pending: templatesPending } = useFetch<any[]>(
  '/api/roadmap-templates',
  { server: false, default: () => [] }
)

function closeTemplatePicker() {
  showTemplatePicker.value = false
  previewTemplate.value = null
  hoveredKey.value = ''
}

function applyTemplate(tpl: any) {
  stages.value = tpl.stages.map((s: any) => ({
    stageKey: s.stageKey || '',
    title: s.title,
    status: 'pending',
    dateStart: '',
    dateEnd: '',
    notes: s.description || '',
  }))
  closeTemplatePicker()
}

// --- Stages ---
function addStage() {
  stages.value.push({
    stageKey: '',
    title: '',
    status: 'pending',
    dateStart: '',
    dateEnd: '',
    notes: '',
  })
}

function removeStage(index: number) {
  stages.value.splice(index, 1)
}

function onScenarioChange(stage: any) {
  const title = scenarioMap[stage.stageKey]
  if (title && !stage.title) {
    stage.title = title
  }
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/projects/${props.slug}/roadmap`, {
      method: 'PUT',
      body: {
        stages: stages.value.map((stage: any, index: number) => ({
          ...stage,
          sortOrder: index,
        }))
      }
    })
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
/* Template picker modal */
.rm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.rm-modal {
  background: var(--color-surface, #fff);
  border: 1px solid rgba(0,0,0,0.12);
  border-radius: 12px;
  width: 480px;
  max-width: 95vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0,0,0,0.18);
}
.dark .rm-modal {
  background: #1a1a2e;
  border-color: rgba(255,255,255,0.1);
}
.rm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  font-size: .85rem;
  font-weight: 500;
  color: inherit;
}
.dark .rm-header { border-color: rgba(255,255,255,0.08); }
.rm-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #888;
  padding: 2px 6px;
}
.rm-close:hover { color: inherit; }
.rm-loading, .rm-empty {
  padding: 32px;
  text-align: center;
  font-size: .83rem;
  color: #888;
}
.rm-body {
  overflow-y: auto;
  flex: 1;
  padding: 12px 16px;
}
.rm-tpl-item {
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background .15s;
}
.rm-tpl-item:hover, .rm-tpl-item--selected {
  background: rgba(0,0,0,0.05);
}
.dark .rm-tpl-item:hover, .dark .rm-tpl-item--selected {
  background: rgba(255,255,255,0.06);
}
.rm-tpl-title { font-size: .84rem; font-weight: 500; margin-bottom: 2px; }
.rm-tpl-desc { font-size: .75rem; color: #888; margin-bottom: 2px; }
.rm-tpl-stages { font-size: .72rem; color: #aaa; }
.rm-back {
  background: none;
  border: none;
  cursor: pointer;
  font-size: .78rem;
  color: #888;
  padding: 0;
  margin-bottom: 12px;
  font-family: inherit;
}
.rm-back:hover { color: inherit; }
.rm-preview-title { font-size: .9rem; font-weight: 600; margin-bottom: 6px; }
.rm-preview-desc { font-size: .78rem; color: #888; margin-bottom: 14px; }
.rm-stage-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.rm-stage-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(0,0,0,0.03);
}
.dark .rm-stage-row { background: rgba(255,255,255,0.04); }
.rm-stage-num {
  min-width: 20px;
  font-size: .75rem;
  color: #aaa;
  padding-top: 1px;
}
.rm-stage-name { font-size: .83rem; font-weight: 500; }
.rm-stage-subdesc { font-size: .73rem; color: #888; margin-top: 2px; }
.rm-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(0,0,0,0.07);
}
.dark .rm-footer { border-color: rgba(255,255,255,0.07); }
.rm-warn { font-size: .75rem; color: #e08a2f; }
.rm-apply { padding: 8px 20px; font-size: .82rem; }
.a-btn-save {
  border: 1px solid #1a1a1a;
  background: #1a1a1a;
  color: #fff;
  padding: 10px 24px;
  font-size: .85rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 4px;
}
.a-btn-save:hover { background: #333; }
.a-btn-sm {
  border: 1px solid #ddd;
  background: transparent;
  padding: 4px 10px;
  font-size: .78rem;
  cursor: pointer;
  font-family: inherit;
  border-radius: 2px;
  color: #666;
}
.a-btn-sm:hover { border-color: #1a1a1a; color: #1a1a1a; }
</style>
