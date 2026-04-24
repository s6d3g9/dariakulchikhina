import type { CSSProperties, ComputedRef, Ref } from 'vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

interface IndicatorState {
  top: number
  visible: boolean
}

export function useAnimatedNavIndicator(
  railEl: Ref<HTMLElement | null>,
  itemEls: Ref<HTMLElement[]>,
  activeIndex: Ref<number>,
): { indicatorStyle: ComputedRef<CSSProperties> } {
  const state = ref<IndicatorState>({ top: 0, visible: false })

  let resizeObserver: ResizeObserver | null = null

  function readIndicatorHeight(): number {
    if (!railEl.value) return 32
    const raw = getComputedStyle(railEl.value).getPropertyValue('--messenger-nav-indicator-height').trim()
    const parsed = Number.parseFloat(raw)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 32
  }

  function measure() {
    const rail = railEl.value
    const idx = activeIndex.value
    const items = itemEls.value
    const item = idx >= 0 ? items[idx] : null

    if (!rail || !item) {
      state.value = { top: state.value.top, visible: false }
      return
    }

    const railRect = rail.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    const indicatorHeight = readIndicatorHeight()
    const top = itemRect.top - railRect.top + (itemRect.height - indicatorHeight) / 2

    state.value = { top, visible: true }
  }

  function handleWindowResize() {
    measure()
  }

  onMounted(async () => {
    await nextTick()
    measure()

    if (railEl.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => measure())
      resizeObserver.observe(railEl.value)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleWindowResize)
    }
  })

  watch(activeIndex, async () => {
    await nextTick()
    measure()
  })

  watch(() => itemEls.value.length, async () => {
    await nextTick()
    measure()
  })

  onUnmounted(() => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', handleWindowResize)
    }
  })

  const indicatorStyle = computed<CSSProperties>(() => ({
    transform: `translateY(${state.value.top}px)`,
    opacity: state.value.visible ? 1 : 0,
  }))

  return { indicatorStyle }
}
