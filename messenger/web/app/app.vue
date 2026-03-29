<script setup lang="ts">
const settingsModel = useMessengerSettings()

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"]'))
}

function shouldLockTouchZoom() {
  if (!import.meta.client) {
    return false
  }

  return window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0
}

function installTouchZoomLock() {
  if (!import.meta.client || !shouldLockTouchZoom()) {
    return () => {}
  }

  const preventGesture = (event: Event) => {
    event.preventDefault()
  }

  const preventMultiTouchZoom = (event: TouchEvent) => {
    if (event.touches.length > 1) {
      event.preventDefault()
    }
  }

  let lastTouchEndAt = 0

  const preventDoubleTapZoom = (event: TouchEvent) => {
    const now = Date.now()
    const rapidRepeatTap = lastTouchEndAt > 0 && now - lastTouchEndAt < 320
    lastTouchEndAt = now

    if (!rapidRepeatTap || isEditableTarget(event.target)) {
      return
    }

    event.preventDefault()
  }

  document.addEventListener('gesturestart', preventGesture, { passive: false })
  document.addEventListener('gesturechange', preventGesture, { passive: false })
  document.addEventListener('touchstart', preventMultiTouchZoom, { passive: false })
  document.addEventListener('touchend', preventDoubleTapZoom, { passive: false })

  return () => {
    document.removeEventListener('gesturestart', preventGesture)
    document.removeEventListener('gesturechange', preventGesture)
    document.removeEventListener('touchstart', preventMultiTouchZoom)
    document.removeEventListener('touchend', preventDoubleTapZoom)
  }
}

let detachTouchZoomLock: (() => void) | null = null

function syncRootBackground(themeColor: string) {
  if (!import.meta.client) {
    return
  }

  document.documentElement.style.backgroundColor = themeColor
  document.body.style.backgroundColor = themeColor
}

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
  detachTouchZoomLock = installTouchZoomLock()
})

watch(
  () => settingsModel.resolvedTheme.value.themeColor,
  (themeColor) => {
    syncRootBackground(themeColor)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  detachTouchZoomLock?.()
  detachTouchZoomLock = null
})
</script>

<template>
  <VApp :theme="settingsModel.vuetifyThemeName.value" class="messenger-v-app">
    <NuxtPage />
  </VApp>
</template>