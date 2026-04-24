import type { CSSProperties, ComputedRef, Ref } from 'vue'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

interface IndicatorState {
  offset: number
  visible: boolean
}

type Axis = 'x' | 'y'

export function useAnimatedNavIndicator(
  containerEl: Ref<HTMLElement | null>,
  itemEls: Ref<HTMLElement[]>,
  activeIndex: Ref<number>,
  options?: { axis?: Axis },
): { indicatorStyle: ComputedRef<CSSProperties> } {
  const axis: Axis = options?.axis ?? 'y'
  const state = ref<IndicatorState>({ offset: 0, visible: false })

  let resizeObserver: ResizeObserver | null = null

  function readIndicatorSize(): number {
    if (!containerEl.value) return 32
    const prop = axis === 'x' ? '--messenger-nav-indicator-width' : '--messenger-nav-indicator-height'
    const raw = getComputedStyle(containerEl.value).getPropertyValue(prop).trim()
    const parsed = Number.parseFloat(raw)
    const fallback = axis === 'x' ? 64 : 32
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
  }

  function measure() {
    const container = containerEl.value
    const idx = activeIndex.value
    const items = itemEls.value
    const item = idx >= 0 ? items[idx] : null

    if (!container || !item) {
      state.value = { offset: state.value.offset, visible: false }
      return
    }

    const containerRect = container.getBoundingClientRect()
    const itemRect = item.getBoundingClientRect()
    const indicatorSize = readIndicatorSize()

    const offset = axis === 'x'
      ? itemRect.left - containerRect.left + (itemRect.width - indicatorSize) / 2
      : itemRect.top - containerRect.top + (itemRect.height - indicatorSize) / 2

    state.value = { offset, visible: true }
  }

  function handleWindowResize() {
    measure()
  }

  onMounted(async () => {
    await nextTick()
    measure()

    if (containerEl.value && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => measure())
      resizeObserver.observe(containerEl.value)
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
    transform: axis === 'x'
      ? `translateX(${state.value.offset}px)`
      : `translateY(${state.value.offset}px)`,
    opacity: state.value.visible ? 1 : 0,
  }))

  return { indicatorStyle }
}
