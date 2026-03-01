<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage
        keepalive
        :transition="{ name: 'fade-page', mode: 'out-in' }"
      />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { initTheme } = useThemeToggle()

onMounted(() => {
  initTheme()
})
</script>
