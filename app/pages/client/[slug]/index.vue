<template>
  <div>
    <div v-if="pending" class="flex items-center justify-center h-64 text-sm text-gray-400">
      Загрузка...
    </div>
    <template v-else-if="project">
      <!-- Шапка -->
      <div class="border-b border-gray-100 px-6 py-8 text-center">
        <h1 class="text-xl font-light tracking-widest uppercase text-gray-800">{{ project.title }}</h1>
      </div>
      <!-- Список страниц -->
      <div class="px-6 pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <NuxtLink
          v-for="pg in availablePages"
          :key="pg.slug"
          :to="`/client/${project.slug}/${pg.slug}`"
          class="border border-gray-200 p-5 hover:border-gray-400 transition-colors group"
        >
          <p class="text-sm text-gray-700 group-hover:text-gray-900">{{ pg.title }}</p>
        </NuxtLink>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'cabinet', middleware: ['client'] })

const route = useRoute()
const { data: project, pending } = await useFetch<any>(`/api/projects/${route.params.slug}`)

const allPageSlugs = [
  { slug: 'materials', title: 'материалы' },
  { slug: 'tz', title: 'техническое задание' },
  { slug: 'profile_customer', title: 'профиль клиента' },
  { slug: 'profile_contractors', title: 'профиль подрядчиков' },
  { slug: 'work_status', title: 'статусы работ' },
  { slug: 'project_roadmap', title: 'дорожная карта' },
]

const availablePages = computed(() => {
  const pages = project.value?.pages || []
  return allPageSlugs.filter(p => pages.includes(p.slug))
})
</script>