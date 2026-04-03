<script setup lang="ts">
const settingsModel = useMessengerSettings()
const install = useMessengerInstall()
const viewport = useMessengerViewport()

function syncDisplayModeDataAttribute(isStandalone: boolean) {
  if (!import.meta.client) {
    return
  }

  document.documentElement.dataset.messengerDisplayMode = isStandalone ? 'standalone' : 'browser'
}

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
let detachViewport: (() => void) | null = null

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
  // На Android interactive-widget=overlays-content не даёт visualViewport.height
  // уменьшаться при клавиатуре — keyboard offset = 0.
  // Убираем его на не-iOS, чтобы viewport ресайзился нативно.
  if (import.meta.client) {
    const ua = navigator.userAgent || ''
    const isApple = /iPad|iPhone|iPod/u.test(ua)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (!isApple) {
      const meta = document.querySelector('meta[name="viewport"]')
      if (meta) {
        meta.setAttribute('content',
          meta.getAttribute('content')!.replace(/,\s*interactive-widget=[^,]*/u, ''))
      }
    }
  }
  detachViewport = viewport.attach()
  detachTouchZoomLock = installTouchZoomLock()
  syncDisplayModeDataAttribute(install.isStandalone.value)
})

watch(
  () => settingsModel.resolvedTheme.value.themeColor,
  (themeColor) => {
    syncRootBackground(themeColor)
  },
  { immediate: true },
)

watch(
  () => install.isStandalone.value,
  (isStandalone) => {
    syncDisplayModeDataAttribute(isStandalone)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  detachViewport?.()
  detachViewport = null
  detachTouchZoomLock?.()
  detachTouchZoomLock = null
})
</script>

<template>
  <VApp :theme="settingsModel.vuetifyThemeName.value" class="messenger-v-app">
    <NuxtPage />
  </VApp>
</template>