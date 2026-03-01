<template>
  <div class="min-h-screen flex items-center justify-center glass-page px-4">
    <div class="glass-card border border-white/60 dark:border-white/10 p-10 w-[420px] max-w-[92vw]">
      <h2 class="text-xs font-medium tracking-widest uppercase text-gray-500 dark:text-gray-300 mb-2">Личный кабинет</h2>
      <p class="text-xs text-gray-500 dark:text-gray-300 mb-6">Выполняется вход...</p>

      <div class="text-sm text-gray-500 dark:text-gray-300 py-2">Переадресация в кабинет клиента без выбора проекта.</div>
      <div class="flex flex-col gap-2 mt-4">
        <a
          href="/api/auth/client-open?auto=1"
          class="w-full text-left glass-chip rounded-lg px-4 py-3 text-sm transition-colors hover:opacity-95"
        >
          Открыть кабинет
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'default' })

await navigateTo('/api/auth/client-open?auto=1', { replace: true, external: true })
</script>
