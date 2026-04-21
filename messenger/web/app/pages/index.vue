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

<style scoped>
.loading-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  height: 100vh;
  color: var(--v-theme-on-surface, #e8e9ed);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  letter-spacing: .3px;
}
.loading-shell__ring {
  margin-bottom: 4px;
}
.loading-shell__bar {
  width: min(320px, 60vw);
}
</style>
