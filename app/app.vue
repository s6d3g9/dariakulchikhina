<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage :keepalive="{ max: 10 }" />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { initTheme } = useThemeToggle()

onMounted(() => {
  initTheme()
})
</script>
