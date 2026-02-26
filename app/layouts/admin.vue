<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-gray-950">
    <!-- Topbar -->
    <header class="border-b border-gray-200 dark:border-gray-800 px-6 py-3 flex items-center justify-between">
      <div class="flex items-center gap-6">
        <NuxtLink to="/admin" class="text-sm font-medium tracking-widest uppercase text-gray-800 dark:text-gray-100">
          Daria Admin
        </NuxtLink>
        <nav class="flex gap-4 text-sm text-gray-500">
          <NuxtLink to="/admin" class="hover:text-gray-900 dark:hover:text-gray-100" active-class="text-gray-900 dark:text-gray-100 font-medium">
            Проекты
          </NuxtLink>
          <NuxtLink to="/admin/contractors" class="hover:text-gray-900 dark:hover:text-gray-100" active-class="text-gray-900 dark:text-gray-100 font-medium">
            Подрядчики
          </NuxtLink>
          <NuxtLink to="/admin/pages" class="hover:text-gray-900 dark:hover:text-gray-100" active-class="text-gray-900 dark:text-gray-100 font-medium">
            Страницы
          </NuxtLink>
        </nav>
      </div>
      <UButton variant="ghost" size="sm" @click="logout">Выйти</UButton>
    </header>
    <main class="flex-1 p-6">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const router = useRouter()
async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  router.push('/admin/login')
}
</script>