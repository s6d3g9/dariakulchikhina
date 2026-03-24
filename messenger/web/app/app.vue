<script setup lang="ts">
const settingsModel = useMessengerSettings()

useHead(() => ({
  meta: [
    {
      key: 'theme-color',
      name: 'theme-color',
      content: settingsModel.resolvedTheme.value.themeColor,
    },
  ],
}))

onMounted(() => {
  settingsModel.hydrate()
})
</script>

<template>
  <VApp :theme="settingsModel.vuetifyThemeName.value" class="messenger-v-app">
    <NuxtPage />
  </VApp>
</template>