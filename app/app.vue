<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage
        keepalive
        :transition="pageTransition"
      />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { initTheme } = useThemeToggle()
const { tokens } = useDesignSystem()

const pageTransition = computed(() => {
  const effect = tokens.value.archPageEnter ?? 'fade'
  const dur = tokens.value.pageTransitDuration ?? 280
  if (effect === 'none') return false
  return { name: `pt-${effect}`, mode: 'out-in', css: true, duration: dur }
})

onMounted(() => {
  initTheme()
})
</script>
