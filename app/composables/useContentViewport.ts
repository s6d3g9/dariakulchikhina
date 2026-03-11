import { computed, nextTick, onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'

type ViewMode = 'scroll' | 'paged' | 'flow'
type Direction = 'next' | 'prev'

export function useContentViewport(options: {
  mode: MaybeRefOrGetter<ViewMode | string | undefined>
  currentSection: Ref<string>
  sectionOrder: MaybeRefOrGetter<string[]>
  onNavigate: (section: string) => void | Promise<void>
  enabled?: MaybeRefOrGetter<boolean>
  transitionMs?: MaybeRefOrGetter<number>
}) {
  const viewportRef = ref<HTMLElement | null>(null)
  const pageIndex = ref(1)
  const pageCount = ref(1)
  const lockUntil = ref(0)
  const navigationBusy = ref(false)

  const contentViewMode = computed<ViewMode>(() => {
    const mode = toValue(options.mode)
    return mode === 'paged' || mode === 'flow' ? mode : 'scroll'
  })

  const isPaged = computed(() => {
    if (toValue(options.enabled) === false) return false
    return contentViewMode.value !== 'scroll'
  })

  const transitionMs = computed(() => {
    const raw = Number(toValue(options.transitionMs) ?? 320)
    if (!Number.isFinite(raw)) return 320
    return Math.min(10000, Math.max(0, raw))
  })

  function syncPager() {
    const el = viewportRef.value
    if (!el || !isPaged.value) {
      pageIndex.value = 1
      pageCount.value = 1
      return
    }

    const viewportHeight = Math.max(el.clientHeight, 1)
    const maxTop = Math.max(0, el.scrollHeight - viewportHeight)
    pageCount.value = Math.max(1, Math.ceil((maxTop + viewportHeight) / viewportHeight))
    pageIndex.value = Math.min(pageCount.value, Math.floor((el.scrollTop + 2) / viewportHeight) + 1)
  }

  function resetViewport() {
    const el = viewportRef.value
    if (!el) return
    el.scrollTo({ top: 0, behavior: 'auto' })
    syncPager()
  }

  function lockPaging() {
    lockUntil.value = Date.now() + Math.min(900, Math.max(260, transitionMs.value))
  }

  function canMove() {
    return !navigationBusy.value && Date.now() >= lockUntil.value
  }

  async function navigateSibling(direction: Direction) {
    const order = toValue(options.sectionOrder)
    const currentIndex = order.findIndex((item) => item === options.currentSection.value)
    const nextIndex = currentIndex + (direction === 'next' ? 1 : -1)
    const target = order[nextIndex]
    if (!target) return false

    navigationBusy.value = true
    lockPaging()
    try {
      await options.onNavigate(target)
      await nextTick()
      resetViewport()
      return true
    } finally {
      window.setTimeout(() => {
        navigationBusy.value = false
        syncPager()
      }, Math.min(900, Math.max(260, transitionMs.value)))
    }
  }

  async function move(direction: Direction) {
    const el = viewportRef.value
    if (!el) return false

    const viewportHeight = Math.max(el.clientHeight, 1)
    const maxTop = Math.max(0, el.scrollHeight - viewportHeight)
    const atStart = el.scrollTop <= 4
    const atEnd = el.scrollTop >= maxTop - 4

    if (direction === 'next' && atEnd) {
      return contentViewMode.value === 'flow' ? navigateSibling('next') : false
    }
    if (direction === 'prev' && atStart) {
      return contentViewMode.value === 'flow' ? navigateSibling('prev') : false
    }

    const targetTop = direction === 'next'
      ? Math.min(maxTop, el.scrollTop + viewportHeight)
      : Math.max(0, el.scrollTop - viewportHeight)

    if (targetTop === el.scrollTop) return false

    lockPaging()
    el.scrollTo({ top: targetTop, behavior: 'smooth' })
    window.setTimeout(syncPager, Math.min(900, Math.max(260, transitionMs.value)))
    return true
  }

  function handleWheel(event: WheelEvent) {
    if (!isPaged.value || !viewportRef.value) return
    if (Math.abs(event.deltaY) < 12) return
    event.preventDefault()
    if (!canMove()) return
    void move(event.deltaY > 0 ? 'next' : 'prev')
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isPaged.value) return
    const isNext = event.key === 'PageDown' || event.key === 'ArrowDown' || event.key === ' '
    const isPrev = event.key === 'PageUp' || event.key === 'ArrowUp'
    if (!isNext && !isPrev) return
    event.preventDefault()
    if (!canMove()) return
    void move(isNext ? 'next' : 'prev')
  }

  watch([options.currentSection, contentViewMode], async () => {
    await nextTick()
    resetViewport()
  })

  onMounted(() => {
    nextTick(syncPager)
    window.addEventListener('resize', syncPager)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', syncPager)
  })

  return {
    viewportRef,
    contentViewMode,
    isPaged,
    pageIndex,
    pageCount,
    syncPager,
    move,
    handleWheel,
    handleKeydown,
  }
}
