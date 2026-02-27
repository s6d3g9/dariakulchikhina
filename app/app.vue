<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { initTheme } = useThemeToggle()

onMounted(() => {
  initTheme()
})
</script>
