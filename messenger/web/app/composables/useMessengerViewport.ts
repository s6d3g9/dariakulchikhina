let detachViewportListeners: (() => void) | null = null
let viewportAnimationFrame = 0
let viewportSettlingTimer: ReturnType<typeof setTimeout> | null = null

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target instanceof HTMLTextAreaElement) {
    return !target.readOnly && !target.disabled
  }

  if (target instanceof HTMLInputElement) {
    const blockedTypes = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'])
    return !target.readOnly && !target.disabled && !blockedTypes.has(target.type)
  }

  return target.isContentEditable
}

function isMobileViewport() {
  if (!import.meta.client) {
    return false
  }

  return window.matchMedia('(max-width: 767px)').matches || navigator.maxTouchPoints > 0
}

function isAppleTouchViewport() {
  if (!import.meta.client) {
    return false
  }

  const userAgent = navigator.userAgent || ''
  const platform = navigator.platform || ''

  return /iPad|iPhone|iPod/u.test(userAgent)
    || (platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isStandaloneDisplayMode() {
  if (!import.meta.client) {
    return false
  }

  const navigatorStandalone = 'standalone' in window.navigator
    ? Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    : false

  return window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: fullscreen)').matches
    || navigatorStandalone
}

export function useMessengerViewport() {
  const viewportHeight = useState<number>('messenger-viewport-height', () => 0)
  const viewportVisibleHeight = useState<number>('messenger-viewport-visible-height', () => 0)
  const viewportOffsetTop = useState<number>('messenger-viewport-offset-top', () => 0)
  const viewportWindowInnerHeight = useState<number>('messenger-window-inner-height', () => 0)
  const keyboardInset = useState<number>('messenger-keyboard-inset', () => 0)
  const keyboardOpen = useState<boolean>('messenger-keyboard-open', () => false)

  function applyViewportStyles(nextViewportHeight: number, nextViewportVisibleHeight: number, nextViewportOffsetTop: number, nextViewportWindowInnerHeight: number, nextKeyboardInset: number, nextKeyboardOpen: boolean) {
    if (!import.meta.client) {
      return
    }

    const root = document.documentElement
    root.style.setProperty('--messenger-viewport-height', `${nextViewportHeight}px`)
    root.style.setProperty('--messenger-viewport-visible-height', `${nextViewportVisibleHeight}px`)
    root.style.setProperty('--messenger-viewport-offset-top', `${nextViewportOffsetTop}px`)
    root.style.setProperty('--messenger-window-inner-height', `${nextViewportWindowInnerHeight}px`)
    root.style.setProperty('--messenger-keyboard-inset', `${nextKeyboardInset}px`)
    root.dataset.messengerKeyboard = nextKeyboardOpen ? 'open' : 'closed'
    root.dataset.messengerViewportPlatform = isAppleTouchViewport() ? 'ios' : 'default'
    root.dataset.messengerDisplayMode = isStandaloneDisplayMode() ? 'standalone' : 'browser'
  }

  function syncViewport() {
    if (!import.meta.client) {
      return
    }

    const visualViewport = window.visualViewport
    const nextViewportWindowInnerHeight = Math.max(0, Math.round(window.innerHeight))
    const visualViewportHeight = Math.max(0, Math.round(visualViewport?.height ?? nextViewportWindowInnerHeight))
    const visualViewportOffsetTop = Math.max(0, Math.round(visualViewport?.offsetTop ?? 0))
    const visualViewportVisibleHeight = Math.max(0, visualViewportHeight + visualViewportOffsetTop)
    const rawKeyboardInset = Math.max(0, Math.round(nextViewportWindowInnerHeight - visualViewportVisibleHeight))
    const focusedEditable = isEditableElement(document.activeElement)
    const mobileViewport = isMobileViewport()
    const viewportCompressed = visualViewportHeight < nextViewportWindowInnerHeight - 24
    const nextKeyboardOpen = mobileViewport && focusedEditable && (rawKeyboardInset > 24 || viewportCompressed)
    const nextKeyboardInset = nextKeyboardOpen ? rawKeyboardInset : 0
    const useStandaloneViewportHeight = isAppleTouchViewport() && isStandaloneDisplayMode() && !nextKeyboardOpen
    const nextViewportHeight = useStandaloneViewportHeight ? nextViewportWindowInnerHeight : visualViewportHeight
    const nextViewportVisibleHeight = useStandaloneViewportHeight ? nextViewportWindowInnerHeight : visualViewportVisibleHeight
    const nextViewportOffsetTop = useStandaloneViewportHeight ? 0 : visualViewportOffsetTop

    viewportHeight.value = nextViewportHeight
    viewportVisibleHeight.value = nextViewportVisibleHeight
    viewportOffsetTop.value = nextViewportOffsetTop
    viewportWindowInnerHeight.value = nextViewportWindowInnerHeight
    keyboardInset.value = nextKeyboardInset
    keyboardOpen.value = nextKeyboardOpen
    applyViewportStyles(nextViewportHeight, nextViewportVisibleHeight, nextViewportOffsetTop, nextViewportWindowInnerHeight, nextKeyboardInset, nextKeyboardOpen)
  }

  function scheduleViewportSync() {
    if (!import.meta.client) {
      return
    }

    if (viewportAnimationFrame) {
      cancelAnimationFrame(viewportAnimationFrame)
    }

    viewportAnimationFrame = requestAnimationFrame(() => {
      syncViewport()
      viewportAnimationFrame = 0
    })

    if (viewportSettlingTimer) {
      clearTimeout(viewportSettlingTimer)
    }

    viewportSettlingTimer = setTimeout(() => {
      syncViewport()
      viewportSettlingTimer = null
    }, 220)
  }

  function attach() {
    if (!import.meta.client) {
      return () => {}
    }

    if (detachViewportListeners) {
      syncViewport()
      return detachViewportListeners
    }

    const visualViewport = window.visualViewport

    syncViewport()
    visualViewport?.addEventListener('resize', scheduleViewportSync)
    visualViewport?.addEventListener('scroll', scheduleViewportSync)
    window.addEventListener('resize', scheduleViewportSync)
    window.addEventListener('orientationchange', scheduleViewportSync)
    document.addEventListener('focusin', scheduleViewportSync)
    document.addEventListener('focusout', scheduleViewportSync)

    detachViewportListeners = () => {
      visualViewport?.removeEventListener('resize', scheduleViewportSync)
      visualViewport?.removeEventListener('scroll', scheduleViewportSync)
      window.removeEventListener('resize', scheduleViewportSync)
      window.removeEventListener('orientationchange', scheduleViewportSync)
      document.removeEventListener('focusin', scheduleViewportSync)
      document.removeEventListener('focusout', scheduleViewportSync)

      if (viewportAnimationFrame) {
        cancelAnimationFrame(viewportAnimationFrame)
        viewportAnimationFrame = 0
      }

      if (viewportSettlingTimer) {
        clearTimeout(viewportSettlingTimer)
        viewportSettlingTimer = null
      }

      detachViewportListeners = null
    }

    return detachViewportListeners
  }

  return {
    viewportHeight,
    viewportVisibleHeight,
    viewportOffsetTop,
    viewportWindowInnerHeight,
    keyboardInset,
    keyboardOpen,
    syncViewport,
    scheduleViewportSync,
    attach,
  }
}