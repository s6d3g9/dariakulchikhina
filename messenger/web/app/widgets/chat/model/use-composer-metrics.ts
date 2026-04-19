import { ref, computed, nextTick, onMounted, onBeforeUnmount, ComputedRef } from 'vue'

export function useComposerMetrics(
  composerBarEl: ComputedRef<HTMLElement | null>,
  composerInputEl: ComputedRef<HTMLElement | null>,
) {
  const composerHeight = ref(76)
  let composerResizeObserver: ResizeObserver | null = null
  let composerAlignTimer: ReturnType<typeof setTimeout> | null = null

  function updateComposerHeight() {
    const nextHeight = composerBarEl.value?.offsetHeight ?? 76
    composerHeight.value = nextHeight
  }

  function syncComposerInputHeight() {
    if (!import.meta.client) {
      return
    }

    const input = composerInputEl.value
    if (!input) {
      return
    }

    const maxHeight = window.matchMedia('(max-width: 767px)').matches ? 104 : 144

    input.style.height = '0px'
    const nextHeight = Math.min(Math.max(input.scrollHeight, 48), maxHeight)
    input.style.height = `${nextHeight}px`
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden'
    updateComposerHeight()
  }

  function resetComposerInputHeight() {
    const input = composerInputEl.value
    if (!input) {
      return
    }

    input.style.height = '48px'
    input.style.overflowY = 'hidden'
    updateComposerHeight()
  }

  function scheduleComposerMetricsSync() {
    if (!import.meta.client) {
      return
    }

    const syncComposer = async () => {
      await nextTick()
      syncComposerInputHeight()
    }

    void syncComposer()

    if (composerAlignTimer) {
      clearTimeout(composerAlignTimer)
    }

    composerAlignTimer = setTimeout(() => {
      void syncComposer()
      composerAlignTimer = null
    }, 260)
  }

  onMounted(() => {
    nextTick(() => {
      resetComposerInputHeight()

      if (composerBarEl.value && typeof ResizeObserver !== 'undefined') {
        composerResizeObserver = new ResizeObserver(() => {
          updateComposerHeight()
        })
        composerResizeObserver.observe(composerBarEl.value)
      }
    })
  })

  onBeforeUnmount(() => {
    if (composerAlignTimer) {
      clearTimeout(composerAlignTimer)
      composerAlignTimer = null
    }
    composerResizeObserver?.disconnect()
    composerResizeObserver = null
  })

  return {
    composerHeight,
    updateComposerHeight,
    syncComposerInputHeight,
    resetComposerInputHeight,
    scheduleComposerMetricsSync,
  }
}
