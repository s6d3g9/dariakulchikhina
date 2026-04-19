<script setup lang="ts">
const auth = useMessengerAuth()

onMounted(async () => {
  await auth.hydrate()

  if (!auth.user.value) {
    await navigateTo('/login')
  }
  else {
    await navigateTo('/projects')
  }
})
</script>

<template>
  <div class="loading-shell">
    <MessengerProgressCircular class="loading-shell__ring" aria-label="Загрузка Messenger" indeterminate four-color size="lg" />
    <div class="loading-shell__bar">
      <MessengerProgressLinear aria-label="Инициализация Messenger" indeterminate four-color />
    </div>
    <div>[ LOADING MESSENGER... ]</div>
  </div>
</template>