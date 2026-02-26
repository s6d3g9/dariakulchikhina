<template>
  <div>
    <div v-if="pending" class="text-sm text-gray-400">Загрузка...</div>
    <template v-else>
      <div class="flex justify-end mb-4">
        <UButton size="sm" @click="save" :loading="saving">Сохранить</UButton>
      </div>
      <div class="grid gap-2">
        <div
          v-for="(stage, idx) in stages"
          :key="idx"
          class="border border-gray-100 p-4"
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
        </div>
      </div>
      <p v-if="error" class="text-red-500 text-xs mt-2">{{ error }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: roadmapData, pending, refresh } = await useFetch<any>(
  () => `/api/projects/${props.slug}/roadmap`
)

const stages = ref<any[]>([])
const saving = ref(false)
const error = ref('')

watch(roadmapData, (v) => {
  stages.value = (v || []).map((s: any) => ({ ...s }))
}, { immediate: true })

async function save() {
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/projects/${props.slug}/roadmap`, {
      method: 'PUT',
      body: { stages: stages.value }
    })
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}
</script>