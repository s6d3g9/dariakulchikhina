<template>
  <NuxtLayout>
    <NuxtPage
      :keepalive="pageKeepalive"
      :transition="resolvedPageTransition"
    />
  </NuxtLayout>
</template>

<script setup lang="ts">
const route = useRoute()
const { initTheme } = useThemeToggle()
const designSystem = useDesignSystem()
const { tokens, isHydrated } = designSystem
const {
  initTheme: initUiTheme,
  availableThemes,
  syncThemeForCurrentMode,
} = useUITheme()
const uiThemeReady = ref(false)

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

watch([availableThemes, isHydrated], ([themes, hydrated]) => {
  if (!import.meta.client || !hydrated || !themes.length) return

  syncThemeForCurrentMode()
}, { immediate: true })

watch(isHydrated, (hydrated) => {
  if (!import.meta.client || !hydrated || uiThemeReady.value) return
  initUiTheme()
  uiThemeReady.value = true
}, { immediate: true })

onMounted(() => {
  initTheme()
  if (!isHydrated.value) {
    designSystem.initDesignSystem()
  }
})
</script>
