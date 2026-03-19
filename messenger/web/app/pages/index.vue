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
  <div v-if="!ready" class="loading-shell">[ LOADING MESSENGER... ]</div>
  <MessengerAppShell v-else />
</template>