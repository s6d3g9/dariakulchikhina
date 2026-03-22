<script setup lang="ts">
const settingsModel = useMessengerSettings()

const vuetifyThemeName = computed(() => {
  const activeTheme = settingsModel.theme.value.active
  return activeTheme === 'beige' || activeTheme === 'gray'
    ? 'messengerLight'
    : 'messengerDark'
})

onMounted(() => {
  settingsModel.hydrate()
})
</script>

<template>
  <VApp :theme="vuetifyThemeName" class="messenger-v-app">
    <NuxtPage />
  </VApp>
</template>