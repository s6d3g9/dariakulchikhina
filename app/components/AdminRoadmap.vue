<template>
  <div class="glass-card p-3">
    <div class="flex items-center justify-between mb-4">
      <span class="text-sm text-gray-600 dark:text-gray-300">{{ stages.length }} этапов</span>
      <div class="flex gap-2">
        <button class="a-btn-sm" @click="addStage">+ добавить этап</button>
        <button class="a-btn-save" @click="save" :disabled="saving">{{ saving ? '...' : 'сохранить' }}</button>
      </div>
    </div>

    <div v-if="pending" class="text-sm text-gray-500 dark:text-gray-300">Загрузка...</div>
    <template v-else>
      <div v-if="!stages.length" class="text-xs text-gray-500 dark:text-gray-300 mb-3">Этапов пока нет. Добавьте первый этап.</div>

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
