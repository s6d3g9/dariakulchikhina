<template>
  <div class="glass-card p-3">
    <div class="flex items-center justify-between mb-4">
      <span class="text-sm text-gray-600 dark:text-gray-300">{{ items?.length || 0 }} задач</span>
      <div class="flex gap-2">
        <button class="a-btn-sm" @click="addItem">+ добавить</button>
        <button class="a-btn-save" @click="save" :disabled="saving">{{ saving ? "..." : "сохранить" }}</button>
      </div>
    </div>
    <div v-if="pending" class="text-sm text-gray-500 dark:text-gray-300">Загрузка...</div>
    <div v-else class="grid gap-3">
      <div
        v-for="(item, idx) in items"
        :key="idx"
        class="glass-surface rounded-xl border border-white/50 dark:border-white/10 p-4"
      >
        <div class="grid grid-cols-3 gap-3 mb-2">
          <div class="col-span-2">
            <label class="text-xs text-gray-500 dark:text-gray-300 block mb-1">Название задачи</label>
            <input v-model="item.title" class="w-full glass-input rounded-md px-2 py-2 text-sm outline-none" />
          </div>
          <div>
            <label class="text-xs text-gray-500 dark:text-gray-300 block mb-1">Статус</label>
            <select v-model="item.status" class="w-full glass-input rounded-md px-2 py-2 text-sm outline-none">
              <option value="pending">ожидание</option>
              <option value="planned">запланировано</option>
              <option value="in_progress">в работе</option>
              <option value="done">выполнено</option>
              <option value="paused">на паузе</option>
              <option value="cancelled">отменено</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3 mb-1">
          <div>
            <label class="text-xs text-gray-500 dark:text-gray-300 block mb-1">Начало</label>
            <AppDatePicker
              v-model="item.dateStart"
              input-class="w-full glass-input rounded-md px-2 py-2 text-xs outline-none"
            />
          </div>
          <div>
            <label class="text-xs text-gray-500 dark:text-gray-300 block mb-1">Конец</label>
            <AppDatePicker
              v-model="item.dateEnd"
              input-class="w-full glass-input rounded-md px-2 py-2 text-xs outline-none"
            />
          </div>
          <div>
            <label class="text-xs text-gray-500 dark:text-gray-300 block mb-1">Бюджет</label>
            <input v-model="item.budget" placeholder="0 руб."
              class="w-full glass-input rounded-md px-2 py-2 text-xs outline-none" />
          </div>
        </div>
        <div class="flex justify-end mt-1">
          <button @click="items.splice(idx, 1)" class="text-xs text-red-400 hover:text-red-500">удалить</button>
        </div>
      </div>
    </div>
    <p v-if="error" class="text-red-500 text-xs mt-2">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()

const { data: rawItems, pending } = await useFetch<any[]>(
  () => `/api/projects/${props.slug}/work-status`
)

const items = ref<any[]>([])
const saving = ref(false)
const error = ref('')

watch(rawItems, (v) => {
  items.value = (v || []).map((i: any) => ({ ...i }))
}, { immediate: true })

function addItem() {
  items.value.push({ title: '', status: 'pending', dateStart: '', dateEnd: '', budget: '', notes: '' })
}

async function save() {
  saving.value = true
  error.value = ''
  try {
    await $fetch(`/api/projects/${props.slug}/work-status`, {
      method: 'PUT',
      body: { items: items.value }
    })
  } catch (e: any) {
    error.value = e.data?.message || 'Ошибка'
  } finally {
    saving.value = false
  }
}
</script>
