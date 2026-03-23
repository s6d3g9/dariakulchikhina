<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage
        :keepalive="pageKeepalive"
        :transition="resolvedPageTransition"
      />
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const route = useRoute()
const { initTheme } = useThemeToggle()
const { tokens } = useDesignSystem()

const authRoutePattern = /^\/(login|register|recover)$/

const disablePageChromeCaching = computed(() => authRoutePattern.test(route.path))

const transitionEffect = computed(() => {
  const effect = tokens.value.archPageEnter ?? 'fade'
  // "slide" is a preset-level shorthand; map it to an existing CSS transition.
  if (effect === 'slide') return 'slide-r'
  return effect
})

const transitionDuration = computed(() => {
  const raw = tokens.value.pageTransitDuration ?? 280
  return Math.min(10000, Math.max(0, raw))
})

const transitionEasing = computed(() => tokens.value.animEasing || 'ease')

const pageTransition = computed(() => {
  const effect = transitionEffect.value
  if (effect === 'none') return false
  return { name: `pt-${effect}`, mode: 'out-in' as const, css: true, duration: transitionDuration.value }
})

const pageKeepalive = computed(() => (disablePageChromeCaching.value ? false : { max: 10 }))
const resolvedPageTransition = computed(() => (disablePageChromeCaching.value ? false : pageTransition.value))

watchEffect(() => {
  if (!import.meta.client) return
  document.documentElement.style.setProperty('--pt-dur', `${transitionDuration.value}ms`)
  document.documentElement.style.setProperty('--pt-ease', transitionEasing.value)
})

onMounted(() => {
  initTheme()
})
</script>
