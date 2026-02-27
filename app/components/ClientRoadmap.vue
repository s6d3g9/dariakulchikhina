<template>
  <div>
    <h2 class="text-sm font-medium tracking-widest uppercase text-gray-500 mb-4">Дорожная карта</h2>
    <div v-if="pending" class="text-sm text-gray-400">Загрузка...</div>
    <div v-else class="relative">
      <!-- Вертикальная линия -->
      <div class="absolute left-3 top-0 bottom-0 w-px bg-gray-200"></div>
      <div class="grid gap-4">
        <div
          v-for="stage in stages"
          :key="stage.id"
          class="flex gap-4 relative"
        >
          <!-- Точка -->
          <div
            class="w-6 h-6 rounded-full border-2 flex-shrink-0 z-10 flex items-center justify-center"
            :class="pointClass(stage.status)"
          ></div>
          <div class="pb-2">
            <p class="text-sm font-medium text-gray-800">{{ stage.title }}</p>
            <p v-if="stage.stageKey" class="text-xs text-gray-500 mt-0.5">{{ stageTypeLabel(stage.stageKey) }}</p>
            <p v-if="stage.description" class="text-xs text-gray-400 mt-0.5">{{ stage.description }}</p>
            <div class="flex gap-3 mt-1">
              <span v-if="stage.dateStart" class="text-xs text-gray-400">{{ stage.dateStart }}</span>
              <span v-if="stage.dateEnd" class="text-xs text-gray-400">→ {{ stage.dateEnd }}</span>
              <span class="text-xs" :class="statusTextClass(stage.status)">{{ statusLabel(stage.status) }}</span>
            </div>
            <p v-if="stage.notes" class="text-xs text-gray-400 italic mt-1">{{ stage.notes }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ROADMAP_STAGE_TYPE_OPTIONS } from '~~/shared/types/catalogs'

const props = defineProps<{ slug: string }>()
const { data: stages, pending } = await useFetch<any[]>(`/api/projects/${props.slug}/roadmap`)

const stageTypeMap = new Map(ROADMAP_STAGE_TYPE_OPTIONS.map(o => [o.value, o.label]))

function pointClass(s: string) {
  const map: Record<string, string> = {
    pending: 'border-gray-300 bg-white',
    in_progress: 'border-blue-400 bg-blue-50',
    done: 'border-green-400 bg-green-100',
    skipped: 'border-gray-200 bg-gray-50',
  }
  return map[s] || 'border-gray-300 bg-white'
}
function statusLabel(s: string) {
  const map: Record<string, string> = {
    pending: 'ожидание', in_progress: 'в работе', done: 'готово', skipped: 'пропущено'
  }
  return map[s] || s
}
function statusTextClass(s: string) {
  const map: Record<string, string> = {
    pending: 'text-gray-400', in_progress: 'text-blue-500', done: 'text-green-600', skipped: 'text-gray-300'
  }
  return map[s] || 'text-gray-400'
}

function stageTypeLabel(key?: string | null) {
  if (!key) return ''
  return stageTypeMap.get(key) || key
}
</script>