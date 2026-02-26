<template>
  <div>
    <!-- Навигация -->
    <div class="border-b border-gray-100 px-6 py-3 flex items-center gap-3">
      <NuxtLink :to="`/client/${route.params.slug}`" class="text-xs text-gray-400 hover:text-gray-700">
        ← Назад
      </NuxtLink>
      <span class="text-xs text-gray-300">/</span>
      <span class="text-xs text-gray-600 capitalize">{{ pageLabel }}</span>
    </div>

    <div class="px-6 pt-6 pb-12">
      <!-- Роадмап -->
      <ClientRoadmap v-if="page === 'project_roadmap'" :slug="route.params.slug as string" />
      <!-- Статусы работ -->
      <ClientWorkStatus v-else-if="page === 'work_status'" :slug="route.params.slug as string" />
      <!-- Обычный JSON-контент -->
      <ClientPageContent v-else :slug="route.params.slug as string" :page="page" />
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'cabinet', middleware: ['client'] })

const route = useRoute()
const page = computed(() => route.params.page as string)

const pageLabels: Record<string, string> = {
  materials: 'материалы',
  tz: 'техническое задание',
  profile_customer: 'профиль клиента',
  profile_contractors: 'профиль подрядчиков',
  work_status: 'статусы работ',
  project_roadmap: 'дорожная карта',
}
const pageLabel = computed(() => pageLabels[page.value] || page.value)
</script>