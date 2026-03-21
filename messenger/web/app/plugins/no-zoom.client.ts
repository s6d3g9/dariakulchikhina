export default defineNuxtPlugin(() => {
  if (!import.meta.client) {
    return
  }

  let lastTouchEndAt = 0

  const preventGesture = (event: Event) => {
    event.preventDefault()
  }

  const preventPinchZoom = (event: TouchEvent) => {
    if (event.touches.length > 1) {
      event.preventDefault()
    }
  }

  const preventDoubleTapZoom = (event: TouchEvent) => {
    const now = Date.now()
    if (now - lastTouchEndAt < 280) {
      event.preventDefault()
    }
    lastTouchEndAt = now
  }

  const preventCtrlWheelZoom = (event: WheelEvent) => {
    if (event.ctrlKey) {
      event.preventDefault()
    }
  }

  document.addEventListener('gesturestart', preventGesture, { passive: false })
  document.addEventListener('touchmove', preventPinchZoom, { passive: false })
  document.addEventListener('touchend', preventDoubleTapZoom, { passive: false })
  document.addEventListener('wheel', preventCtrlWheelZoom, { passive: false })
})