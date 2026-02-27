<template>
  <div>
    <div v-if="pending" class="text-sm text-gray-400">Загрузка...</div>
    <template v-else>
      <div class="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div class="flex items-end gap-2">
          <div>
            <label class="text-xs text-gray-400 block mb-1">Готовый шаблон дорожной карты</label>
            <select v-model="selectedTemplateKey" class="border border-gray-200 px-2 py-1 text-sm outline-none min-w-[340px]">
              <option value="">— выбрать шаблон —</option>
              <option v-for="tpl in templates" :key="tpl.key" :value="tpl.key">
                {{ tpl.title }}{{ tpl.isBuiltIn ? ' · встроенный' : ' · пользовательский' }}
              </option>
            </select>
          </div>
          <button class="a-btn-sm" :disabled="!selectedTemplateKey" @click="applyTemplate">применить</button>
        </div>
        <div class="flex gap-2">
          <button class="a-btn-sm" @click="addStage">+ этап</button>
          <button class="a-btn-save" @click="save" :disabled="saving">{{ saving ? "..." : "сохранить" }}</button>
        </div>
      </div>

      <p v-if="selectedTemplateDescription" class="text-xs text-gray-500 mb-3">{{ selectedTemplateDescription }}</p>
      <p v-if="templatesError" class="text-xs text-amber-600 mb-3">
        Серверные шаблоны временно недоступны, используется встроенный каталог сценариев.
      </p>
      <p v-if="!templates.length" class="text-xs text-gray-500 mb-3">
        Шаблоны не найдены. Откройте
        <NuxtLink to="/admin/roadmap-templates" class="underline">roadmap-шаблоны</NuxtLink>
        и создайте/склонируйте шаблон.
      </p>

      <div class="grid gap-2">
        <div
          v-for="(stage, idx) in stages"
          :key="idx"
          class="border border-gray-200 p-4 bg-white"
        >
          <div class="grid grid-cols-3 gap-3 mb-2">
            <div class="col-span-2">
              <label class="text-xs text-gray-400 block mb-1">Название этапа</label>
              <input v-model="stage.title" class="w-full border-b border-gray-200 pb-1 text-sm outline-none focus:border-gray-500" />
            </div>
            <div>
              <label class="text-xs text-gray-400 block mb-1">Статус</label>
              <select v-model="stage.status" class="w-full border border-gray-200 px-2 py-1 text-sm outline-none">
                <option value="pending">ожидание</option>
                <option value="in_progress">в работе</option>
                <option value="done">выполнено</option>
                <option value="skipped">пропущено</option>
              </select>
            </div>
          </div>
          <div class="mb-2">
            <label class="text-xs text-gray-400 block mb-1">Тип этапа</label>
            <select v-model="stage.stageKey" class="w-full border border-gray-200 px-2 py-1 text-sm outline-none">
              <option value="">—</option>
              <option v-for="opt in ROADMAP_STAGE_TYPE_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-gray-400 block mb-1">Начало</label>
              <input v-model="stage.dateStart" type="text" placeholder="дд.мм.гггг"
                class="w-full border-b border-gray-200 pb-1 text-sm outline-none focus:border-gray-500" />
            </div>
            <div>
              <label class="text-xs text-gray-400 block mb-1">Конец</label>
              <input v-model="stage.dateEnd" type="text" placeholder="дд.мм.гггг"
                class="w-full border-b border-gray-200 pb-1 text-sm outline-none focus:border-gray-500" />
            </div>
          </div>
          <div class="mt-2">
            <textarea v-model="stage.notes" rows="2" placeholder="заметки..."
              class="w-full border border-gray-100 px-2 py-1 text-xs outline-none focus:border-gray-300 resize-none" />
          </div>
          <div class="flex justify-end mt-2">
            <button class="text-xs text-red-400 hover:text-red-600" @click="removeStage(idx)">удалить этап</button>
          </div>
        </div>
      </div>
      <p v-if="error" class="text-red-500 text-xs mt-2">{{ error }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  CLIENT_TYPE_OPTIONS,
  OBJECT_TYPE_OPTIONS,
  ROADMAP_COMPLEXITY_OPTIONS,
  ROADMAP_STAGE_TYPE_OPTIONS,
} from '~~/shared/types/catalogs'
import { ROADMAP_TEMPLATES } from '~~/shared/types/roadmap-templates'

const props = defineProps<{ slug: string }>()

const { data: roadmapData, pending, refresh } = await useFetch<any>(
  () => `/api/projects/${props.slug}/roadmap`
)
const { data: templatesData, error: templatesError } = await useFetch<any[]>('/api/roadmap-templates')

const stages = ref<any[]>([])
const saving = ref(false)
const error = ref('')
const selectedTemplateKey = ref('')
const templates = computed(() => {
  if (Array.isArray(templatesData.value) && templatesData.value.length) return templatesData.value
  return ROADMAP_TEMPLATES.map(t => ({ ...t, isBuiltIn: true }))
})

const selectedTemplateDescription = computed(() => {
  const tpl = templates.value.find(t => t.key === selectedTemplateKey.value)
  if (!tpl) return ''
  const objectLabel = OBJECT_TYPE_OPTIONS.find(o => o.value === tpl.objectType)?.label || tpl.objectType
  const clientLabel = CLIENT_TYPE_OPTIONS.find(o => o.value === tpl.clientType)?.label || tpl.clientType
  const complexityLabel = ROADMAP_COMPLEXITY_OPTIONS.find(o => o.value === tpl.complexity)?.label || tpl.complexity
  return `${tpl.description} · Объект: ${objectLabel} · Клиент: ${clientLabel} · Сложность: ${complexityLabel}`
})

watch(roadmapData, (v) => {
  stages.value = (v || []).map((s: any) => ({ ...s }))
}, { immediate: true })

function addStage() {
  stages.value.push({
    title: 'Новый этап',
    status: 'pending',
    stageKey: 'brief',
    dateStart: '',
    dateEnd: '',
    notes: '',
    sortOrder: stages.value.length,
  })
}

function removeStage(idx: number) {
  stages.value.splice(idx, 1)
}

function applyTemplate() {
  const tpl = templates.value.find(t => t.key === selectedTemplateKey.value)
  if (!tpl) return
  stages.value = tpl.stages.map((s, idx) => ({
    title: s.title,
    description: s.description || '',
    stageKey: s.stageKey,
    status: 'pending',
    dateStart: '',
    dateEnd: '',
    notes: s.notes || '',
    sortOrder: idx,
  }))
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    const normalized = stages.value.map((s, idx) => ({
      ...s,
      sortOrder: idx,
      status: s.status || 'pending',
      title: s.title || `Этап ${idx + 1}`,
    }))
    await $fetch(`/api/projects/${props.slug}/roadmap`, {
      method: 'PUT',
      body: { stages: normalized }
    })
    refresh()
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}
</script>