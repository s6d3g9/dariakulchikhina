<template>
  <div>
    <div v-if="pending" class="text-sm text-gray-400 dark:text-gray-500">Загрузка...</div>
    <template v-else-if="contractor">
      <div class="mb-6">
        <h1 class="text-lg font-light">{{ contractor.name }}</h1>
        <p v-if="contractor.companyName" class="text-sm text-gray-400">{{ contractor.companyName }}</p>
      </div>

      <!-- Статусы работ -->
      <h2 class="text-xs font-medium tracking-widest uppercase text-gray-500 mb-3">Задачи</h2>
      <div v-if="!workItems?.length" class="text-sm text-gray-400">Нет задач</div>
      <div v-else class="grid gap-2">
        <div
          v-for="item in workItems"
          :key="item.id"
          class="border border-gray-100 dark:border-gray-700 p-4"
        >
          <div class="flex items-start justify-between">
            <span class="text-sm font-medium">{{ item.title }}</span>
            <span
              class="text-xs px-2 py-0.5 rounded"
              :class="statusClass(item.status)"
            >
              {{ statusLabel(item.status) }}
            </span>
          </div>
          <div v-if="item.dateStart || item.dateEnd" class="text-xs text-gray-400 mt-1">
            {{ item.dateStart }} — {{ item.dateEnd }}
          </div>
          <div v-if="item.budget" class="text-xs text-gray-500 mt-1">Бюджет: {{ item.budget }}</div>
          <div v-if="item.notes" class="text-xs text-gray-400 mt-1">{{ item.notes }}</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'contractor', middleware: ['contractor'] })

const route = useRoute()
const id = computed(() => route.params.id as string)

const { data: contractor, pending } = await useFetch<any>(`/api/contractors/${id.value}`)
const { data: workItems } = await useFetch<any[]>(`/api/contractors/${id.value}/work-items`)

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: 'ожидание', in_progress: 'в работе', done: 'выполнено',
    planned: 'запланировано', paused: 'на паузе', cancelled: 'отменено'
  }
  return map[s] || s
}
function statusClass(s: string) {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
    planned: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
    in_progress: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400',
    done: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400',
    paused: 'bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400',
    cancelled: 'bg-red-50 dark:bg-red-950 text-red-500 dark:text-red-400',
  }
  return map[s] || 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
}
</script>

<style scoped>
.contractor-name {
  color: #1a1a1a;
}
</style>
