<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage
        :keepalive="{ max: 10 }"
        :transition="pageTransition"
      />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const { initTheme } = useThemeToggle()
const { tokens } = useDesignSystem()

const transitionEffect = computed(() => {
  const effect = tokens.value.archPageEnter ?? 'fade'
  // "slide" is a preset-level shorthand; map it to an existing CSS transition.
  if (effect === 'slide') return 'slide-r'
  return effect
})

const transitionDuration = computed(() => {
  const raw = tokens.value.pageTransitDuration ?? 280
  return Math.min(800, Math.max(80, raw))
})

const pageTransition = computed(() => {
  const effect = transitionEffect.value
  if (effect === 'none') return false
  return { name: `pt-${effect}`, mode: 'out-in', css: true, duration: transitionDuration.value }
})

watchEffect(() => {
  if (!import.meta.client) return
  document.documentElement.style.setProperty('--pt-dur', `${transitionDuration.value}ms`)
})

onMounted(() => {
  initTheme()
})
</script>
