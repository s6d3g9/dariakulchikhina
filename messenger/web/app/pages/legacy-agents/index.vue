<script setup lang="ts">
const auth = useMessengerAuth()
const ready = ref(false)
const bannerDismissed = ref(false)

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
  <template v-else>
    <VAlert
      v-if="!bannerDismissed"
      type="warning"
      class="legacy-agents-banner"
      closable
      @click:close="bannerDismissed = true"
    >
      <strong>Устаревший вид.</strong>
      Этот раздел будет удалён в Wave 7.
      <NuxtLink to="/projects" class="legacy-agents-banner__link">Перейти к проектам →</NuxtLink>
    </VAlert>
    <MessengerAppShell />
  </template>
</template>

<style scoped>
.loading-shell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  height: 100vh;
}

.loading-shell__ring {
  margin-bottom: 8px;
}

.loading-shell__bar {
  width: 200px;
}

.legacy-agents-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  border-radius: 0;
}

.legacy-agents-banner__link {
  color: inherit;
  font-weight: 600;
  margin-left: 8px;
}
</style>
