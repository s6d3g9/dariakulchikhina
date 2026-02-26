<template>
  <div>
    <h2 class="text-sm font-medium tracking-widest uppercase text-gray-500 mb-4">Статусы работ</h2>
    <div v-if="pending" class="text-sm text-gray-400">Загрузка...</div>
    <div v-else-if="!items?.length" class="text-sm text-gray-400">Нет задач</div>
    <div v-else class="grid gap-2">
      <div
        v-for="item in items"
        :key="item.id"
        class="border border-gray-100 p-4"
      >
        <div class="flex items-start justify-between">
          <span class="text-sm font-medium">{{ item.title }}</span>
          <span class="text-xs px-2 py-0.5 rounded" :class="statusClass(item.status)">
            {{ statusLabel(item.status) }}
          </span>
        </div>
        <div v-if="item.dateStart || item.dateEnd" class="text-xs text-gray-400 mt-1">
          {{ item.dateStart }} — {{ item.dateEnd }}
        </div>
        <div v-if="item.budget" class="text-xs text-gray-500 mt-1">{{ item.budget }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string }>()
const { data: items, pending } = await useFetch<any[]>(`/api/projects/${props.slug}/work-status`)

function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: 'ожидание', planned: 'запланировано', in_progress: 'в работе',
    done: 'выполнено', paused: 'на паузе', cancelled: 'отменено'
  }
  return map[s] || s
}
function statusClass(s: string) {
  const map: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-500',
    planned: 'bg-blue-50 text-blue-600',
    in_progress: 'bg-yellow-50 text-yellow-700',
    done: 'bg-green-50 text-green-700',
    paused: 'bg-orange-50 text-orange-600',
    cancelled: 'bg-red-50 text-red-500',
  }
  return map[s] || 'bg-gray-100 text-gray-500'
}
</script>