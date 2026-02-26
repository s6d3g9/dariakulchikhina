<template>
  <div class="min-h-screen flex flex-col bg-white dark:bg-gray-950">
    <header class="border-b border-gray-100 dark:border-gray-800 px-6 py-3 flex items-center justify-between">
      <span class="text-sm tracking-widest uppercase text-gray-500">Кабинет подрядчика</span>
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
  await $fetch('/api/auth/contractor-logout', { method: 'POST' })
  router.push('/contractor/login')
}
</script>