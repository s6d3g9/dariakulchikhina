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

export function useMessengerViewport() {
  const viewportHeight = useState<number>('messenger-viewport-height', () => 0)
  const viewportVisibleHeight = useState<number>('messenger-viewport-visible-height', () => 0)
  const viewportOffsetTop = useState<number>('messenger-viewport-offset-top', () => 0)
  const keyboardInset = useState<number>('messenger-keyboard-inset', () => 0)
  const keyboardOpen = useState<boolean>('messenger-keyboard-open', () => false)

  function applyViewportStyles(nextViewportHeight: number, nextViewportVisibleHeight: number, nextViewportOffsetTop: number, nextKeyboardInset: number, nextKeyboardOpen: boolean) {
    if (!import.meta.client) {
      return
    }

    const root = document.documentElement
    root.style.setProperty('--messenger-viewport-height', `${nextViewportHeight}px`)
    root.style.setProperty('--messenger-viewport-visible-height', `${nextViewportVisibleHeight}px`)
    root.style.setProperty('--messenger-viewport-offset-top', `${nextViewportOffsetTop}px`)
    root.style.setProperty('--messenger-keyboard-inset', `${nextKeyboardInset}px`)
    root.dataset.messengerKeyboard = nextKeyboardOpen ? 'open' : 'closed'
    root.dataset.messengerViewportPlatform = isAppleTouchViewport() ? 'ios' : 'default'
  }

  function syncViewport() {
    if (!import.meta.client) {
      return
    }

    const visualViewport = window.visualViewport
    const nextViewportHeight = Math.max(0, Math.round(visualViewport?.height ?? window.innerHeight))
    const offsetTop = Math.max(0, Math.round(visualViewport?.offsetTop ?? 0))
    const nextViewportVisibleHeight = Math.max(0, nextViewportHeight + offsetTop)
    const rawKeyboardInset = Math.max(0, Math.round(window.innerHeight - nextViewportVisibleHeight))
    const focusedEditable = isEditableElement(document.activeElement)
    const mobileViewport = isMobileViewport()
    const viewportCompressed = nextViewportHeight < window.innerHeight - 24
    const nextKeyboardOpen = mobileViewport && focusedEditable && (rawKeyboardInset > 24 || viewportCompressed)
    const nextKeyboardInset = nextKeyboardOpen ? rawKeyboardInset : 0

    viewportHeight.value = nextViewportHeight
    viewportVisibleHeight.value = nextViewportVisibleHeight
    viewportOffsetTop.value = offsetTop
    keyboardInset.value = nextKeyboardInset
    keyboardOpen.value = nextKeyboardOpen
    applyViewportStyles(nextViewportHeight, nextViewportVisibleHeight, offsetTop, nextKeyboardInset, nextKeyboardOpen)
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
    keyboardInset,
    keyboardOpen,
    syncViewport,
    scheduleViewportSync,
    attach,
  }
}