<template>
  <div>
    <div v-if="pending" class="text-sm text-gray-400">Загрузка...</div>
    <template v-else-if="content">
      <!-- materials / profile: с вкладками -->
      <div v-if="content.tabs">
        <div class="flex gap-1 border-b border-gray-100 mb-5 text-sm overflow-x-auto">
          <button
            v-for="tab in content.tabs"
            :key="tab.id"
            class="px-4 py-2 whitespace-nowrap border-b-2 transition-colors"
            :class="activeTab === tab.id
              ? 'border-gray-700 text-gray-900 font-medium'
              : 'border-transparent text-gray-400 hover:text-gray-700'"
            @click="activeTab = tab.id"
          >
            {{ tab.title }}
          </button>
        </div>
        <template v-for="tab in content.tabs" :key="tab.id">
          <div v-if="activeTab === tab.id">
            <h3 v-if="tab.heading" class="text-base font-light mb-4 text-gray-700">{{ tab.heading }}</h3>
            <div v-for="group in tab.groups" :key="group.label" class="mb-5">
              <h4 class="text-xs font-medium tracking-wider uppercase text-gray-400 mb-2">{{ group.label }}</h4>
              <ul class="space-y-1">
                <li v-for="(item, idx) in group.items" :key="idx" class="text-sm text-gray-700 flex items-center gap-2">
                  <span class="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0"></span>
                  {{ item.text || item.label || item }}
                </li>
              </ul>
            </div>
          </div>
        </template>
      </div>

      <!-- tz: с секциями -->
      <div v-else-if="content.sections">
        <div v-for="section in content.sections" :key="section.id" class="mb-6">
          <h3 class="text-sm font-medium tracking-widest uppercase text-gray-500 mb-3">
            {{ section.num }}. {{ section.title }}
          </h3>
          <ul class="space-y-2">
            <li
              v-for="(q, qi) in section.questions"
              :key="qi"
              class="text-sm text-gray-700 pl-4 border-l border-gray-100"
            >
              {{ q.label }}
            </li>
          </ul>
        </div>
      </div>

      <!-- fallback: raw JSON -->
      <pre v-else class="text-xs font-mono text-gray-500 overflow-auto">{{ JSON.stringify(content, null, 2) }}</pre>
    </template>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ slug: string; page: string }>()

const { data: content, pending, refresh } = await useFetch<any>(
  () => `/api/projects/${props.slug}/page-content?pageSlug=${props.page}`
)

watch(() => props.page, () => refresh())

const activeTab = ref('')
watch(content, (v) => {
  if (v?.tabs?.length) activeTab.value = v.tabs[0].id
}, { immediate: true })
</script>