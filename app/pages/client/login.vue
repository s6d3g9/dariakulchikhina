<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50">
    <div class="bg-white border border-gray-200 p-10 w-[420px] max-w-[92vw]">
      <h2 class="text-xs font-medium tracking-widest uppercase text-gray-400 mb-2">Личный кабинет</h2>
      <p class="text-xs text-gray-400 mb-6">Выберите проект</p>

      <div v-if="pending" class="text-sm text-gray-400 py-6">Загрузка проектов...</div>
      <div v-else-if="!projects?.length" class="text-sm text-gray-400 py-6">Нет доступных проектов</div>
      <div v-else class="flex flex-col gap-2">
        <a
          v-for="p in projects"
          :key="p.slug"
          :href="`/api/auth/client-open?projectSlug=${encodeURIComponent(p.slug)}`"
          class="w-full text-left border border-gray-300 px-4 py-3 text-sm hover:border-gray-700 hover:text-gray-900 transition-colors"
        >
          <span class="text-gray-800">{{ p.title }}</span>
          <span class="text-gray-400 text-xs ml-2">{{ p.slug }}</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

type PublicProject = { slug: string; title: string }

const { data: projects, pending } = await useFetch<PublicProject[]>('/api/public/projects', {
  server: false,
})
</script>
