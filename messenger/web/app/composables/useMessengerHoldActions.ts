const HOLD_DELAY_MS = 1000

function isHoldActionMenuTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('[data-hold-actions-menu="true"]'))
}

export function useMessengerHoldActions() {
  const activeItemId = ref<string | null>(null)

  let holdTimer: ReturnType<typeof setTimeout> | null = null
  let suppressRootClickUntil = 0

  function clearHoldTimer() {
    if (holdTimer) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
  }

  function dismiss() {
    activeItemId.value = null
  }

  function startHold(itemId: string, event: PointerEvent) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    if (isHoldActionMenuTarget(event.target)) {
      return
    }

    clearHoldTimer()

    holdTimer = setTimeout(() => {
      activeItemId.value = itemId
      suppressRootClickUntil = Date.now() + 800
      holdTimer = null
    }, HOLD_DELAY_MS)
  }

  function cancelHold() {
    clearHoldTimer()
  }

  function consumeSuppressedClick() {
    if (Date.now() <= suppressRootClickUntil) {
      suppressRootClickUntil = 0
      return true
    }

    return false
  }

  onMounted(() => {
    document.addEventListener('pointerdown', handleOutsidePointerDown)
  })

  onBeforeUnmount(() => {
    clearHoldTimer()
    document.removeEventListener('pointerdown', handleOutsidePointerDown)
  })

  function handleOutsidePointerDown(event: PointerEvent) {
    if (event.target instanceof Element && event.target.closest('[data-hold-actions-root="true"]')) {
      return
    }

    dismiss()
  }

  return {
    activeItemId,
    startHold,
    cancelHold,
    consumeSuppressedClick,
    dismiss,
  }
}