<script setup lang="ts">
const auth = useMessengerAuth()
const ready = ref(false)

onMounted(async () => {
  await auth.hydrate()
  ready.value = true

  if (!auth.user.value) {
    await navigateTo('/login')
  }
})
</script>

<template>
  <div v-if="!ready" class="loading-shell">
    <MessengerProgressCircular class="loading-shell__ring" aria-label="Загрузка Messenger" indeterminate four-color size="lg" />
    <div class="loading-shell__bar">
      <MessengerProgressLinear aria-label="Инициализация Messenger" indeterminate four-color />
    </div>
    <div>[ LOADING MESSENGER... ]</div>
  </div>
  <MessengerAppShell v-else />
</template>