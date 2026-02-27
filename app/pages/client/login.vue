<template>
  <div class="min-h-screen flex items-center justify-center glass-page px-4">
    <div class="glass-card border border-white/60 dark:border-white/10 p-10 w-[420px] max-w-[92vw]">
      <h2 class="text-xs font-medium tracking-widest uppercase text-gray-500 dark:text-gray-300 mb-2">Личный кабинет</h2>
      <p class="text-xs text-gray-500 dark:text-gray-300 mb-6">Выберите проект</p>

      <div v-if="pending" class="text-sm text-gray-500 dark:text-gray-300 py-6">Загрузка проектов...</div>
      <div v-else-if="!projects?.length" class="text-sm text-gray-500 dark:text-gray-300 py-6">Нет доступных проектов</div>
      <div v-else class="flex flex-col gap-2">
        <a
          v-for="p in projects"
          :key="p.slug"
          :href="`/api/auth/client-open?projectSlug=${encodeURIComponent(p.slug)}`"
          class="w-full text-left glass-chip rounded-lg px-4 py-3 text-sm transition-colors hover:opacity-95"
        >
          <span class="text-gray-800 dark:text-gray-100">{{ p.title }}</span>
          <span class="text-gray-500 dark:text-gray-400 text-xs ml-2">{{ p.slug }}</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

type PublicProject = { slug: string; title: string }

const { data: projects, pending } = await useFetch<PublicProject[]>('/api/public/projects', {
  default: () => [],
})
</script>
