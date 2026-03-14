import { computed, nextTick, onBeforeUnmount, onMounted, ref, toValue, watch, type MaybeRefOrGetter, type Ref } from 'vue'
import { applyViewportZoneLayout, buildViewportPageStops, resolveViewportPagerRailInset, resolveViewportSheetInsets } from '~/utils/contentViewportPager'

type ViewMode = 'scroll' | 'paged' | 'flow' | 'wipe' | 'wipe2'
type Direction = 'next' | 'prev'

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || target.matches('input, textarea, select, [contenteditable="true"]')
}

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
  const pageStops = ref<number[]>([0])
  const lockUntil = ref(0)
  const navigationBusy = ref(false)
  const wipePhase = ref<'idle' | 'cover' | 'reveal'>('idle')
  const wipeDirection = ref<Direction>('next')
  let wipeTimers: number[] = []
  let pagerObserver: MutationObserver | null = null
  let pagerSyncFrame = 0

  const contentViewMode = computed<ViewMode>(() => {
    const mode = toValue(options.mode)
    return (mode === 'paged' || mode === 'flow' || mode === 'wipe' || mode === 'wipe2') ? (mode as ViewMode) : 'scroll'
  })

  const isPaged = computed(() => {
    if (toValue(options.enabled) === false) return false
    return contentViewMode.value !== 'scroll'
  })

  const pagerModeLabel = computed(() => {
    if (contentViewMode.value === 'flow') return 'поток'
    if (contentViewMode.value === 'wipe') return 'листы'
    return 'экраны'
  })

  const pagerNextLabel = computed(() => {
    if (contentViewMode.value === 'flow') return 'экран / след.'
    if (contentViewMode.value === 'wipe') return 'лист →'
    return 'экран →'
  })

  const transitionMs = computed(() => {
    const raw = Number(toValue(options.transitionMs) ?? 320)
    if (!Number.isFinite(raw)) return 320
    return Math.min(10000, Math.max(0, raw))
  })

  function clearWipeTimers() {
    wipeTimers.forEach((timer) => window.clearTimeout(timer))
    wipeTimers = []
  }

  function getWipeInner() {
    return viewportRef.value?.querySelector<HTMLElement>('.cv-wipe-inner') ?? null
  }

  function getCurrentWipeOffset(): number {
    const inner = getWipeInner()
    if (!inner) return 0
    const m = inner.style.transform.match(/translateY\((-?[\d.]+)px\)/)
    return m ? -parseFloat(m[1]) : 0
  }

  function setWipeOffset(offset: number) {
    const inner = getWipeInner()
    if (inner) inner.style.transform = `translateY(${-offset}px)`
  }

  function syncViewportAttrs() {
    const el = viewportRef.value
    if (!el) return

    const panelHeight = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dp-panel-h')) || 28
    const viewportHeight = Math.max(240, window.innerHeight - panelHeight)
    const isWipe = contentViewMode.value === 'wipe'

    let sheetTop: number
    let sheetBottom: number

    if (isWipe) {
      // Читаем wipe-токены с root (устанавливаются дизайн-системой)
      const rootStyle = getComputedStyle(document.documentElement)
      const rawTop = parseFloat(rootStyle.getPropertyValue('--wipe-top-inset'))
      const rawBottom = parseFloat(rootStyle.getPropertyValue('--wipe-bottom-inset'))
      sheetTop = Number.isFinite(rawTop) && rawTop > 0 ? rawTop : 48
      sheetBottom = Math.max(
        Number.isFinite(rawBottom) && rawBottom > 0 ? rawBottom : 106,
        resolveViewportPagerRailInset(el) + 14,
      )
      el.dataset.cvWipeTransition = rootStyle.getPropertyValue('--wipe-transition').trim() || 'slide'
      el.style.setProperty('--wipe-page-fill', rootStyle.getPropertyValue('--wipe-page-fill').trim() || '0.85')
    } else {
      const sheetInsets = resolveViewportSheetInsets(viewportHeight, resolveViewportPagerRailInset(el))
      sheetTop = sheetInsets.top
      sheetBottom = sheetInsets.bottom
      delete el.dataset.cvWipeTransition
    }

    el.dataset.cvMode = contentViewMode.value
    el.dataset.cvDir = wipeDirection.value
    if (wipePhase.value === 'idle') {
      delete el.dataset.cvPhase
    } else {
      el.dataset.cvPhase = wipePhase.value
    }
    el.style.setProperty('--cv-transition-ms', `${transitionMs.value}ms`)
    el.style.setProperty('--cv-viewport-height', `${viewportHeight}px`)
    el.style.setProperty('--cv-sheet-top', `${sheetTop}px`)
    el.style.setProperty('--cv-sheet-bottom', `${sheetBottom}px`)
  }

  function syncPager() {
    const el = viewportRef.value
    if (!el || !isPaged.value) {
      pageStops.value = [0]
      pageIndex.value = 1
      pageCount.value = 1
      return
    }

    syncViewportAttrs()

    // wipe2: Wipe2Renderer handles its own navigation — no page stops needed
    if (contentViewMode.value === 'wipe2') {
      pageStops.value = [0]
      pageIndex.value = 1
      pageCount.value = 1
      return
    }

    applyViewportZoneLayout(el)
    pageStops.value = buildViewportPageStops(el)
    pageCount.value = pageStops.value.length

    updatePageIndexFromScroll(el)
  }

  function updatePageIndexFromScroll(el = viewportRef.value) {
    if (!el || !isPaged.value) {
      pageIndex.value = 1
      pageCount.value = Math.max(1, pageStops.value.length)
      return
    }

    if (contentViewMode.value === 'wipe') {
      const currentOffset = getCurrentWipeOffset()
      const currentIndex = pageStops.value.findLastIndex((s: number) => s <= currentOffset + 2)
      pageIndex.value = Math.max(1, (currentIndex >= 0 ? currentIndex : 0) + 1)
      return
    }

    const currentTop = el.scrollTop + 2
    const currentIndex = pageStops.value.findLastIndex((stop: number) => stop <= currentTop)
    pageIndex.value = Math.max(1, (currentIndex >= 0 ? currentIndex : 0) + 1)
  }

  function scheduleSyncPager() {
    if (pagerSyncFrame || !isPaged.value) return
    pagerSyncFrame = window.requestAnimationFrame(() => {
      pagerSyncFrame = 0
      syncPager()
    })
  }

  function reconnectPagerObserver() {
    pagerObserver?.disconnect()
    pagerObserver = null

    const el = viewportRef.value
    if (!el || typeof MutationObserver === 'undefined') return

    pagerObserver = new MutationObserver(() => {
      if (navigationBusy.value) return
      scheduleSyncPager()
    })

    pagerObserver.observe(el, {
      childList: true,
      subtree: true,
    })
  }

  function resetViewport() {
    const el = viewportRef.value
    if (!el) return
    clearWipeTimers()
    wipePhase.value = 'idle'
    syncViewportAttrs()
    if (contentViewMode.value === 'wipe') {
      setWipeOffset(0)
    } else {
      el.scrollTo({ top: 0, behavior: 'auto' })
    }
    syncPager()
  }

  function lockPaging() {
    lockUntil.value = Date.now() + Math.min(900, Math.max(260, transitionMs.value))
  }

  function canMove() {
    return !navigationBusy.value && Date.now() >= lockUntil.value
  }

  function moveWithWipe(targetOffset: number, direction: Direction) {
    const el = viewportRef.value
    if (!el) return false

    const total = transitionMs.value
    if (total <= 0) {
      setWipeOffset(targetOffset)
      syncPager()
      return true
    }

    clearWipeTimers()
    wipeDirection.value = direction
    wipePhase.value = 'cover'
    syncViewportAttrs()
    lockPaging()

    const half = Math.max(80, Math.round(total * 0.48))
    wipeTimers.push(window.setTimeout(() => {
      setWipeOffset(targetOffset)
      syncPager()
      wipePhase.value = 'reveal'
      syncViewportAttrs()
    }, half))

    wipeTimers.push(window.setTimeout(() => {
      wipePhase.value = 'idle'
      syncViewportAttrs()
      syncPager()
    }, Math.max(half + 80, total)))

    return true
  }

  async function navigateSibling(direction: Direction) {
    const order = toValue(options.sectionOrder)
    const currentIndex = order.findIndex((item: string) => item === options.currentSection.value)
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
    // wipe2 mode: Wipe2Renderer handles its own card navigation
    if (contentViewMode.value === 'wipe2') return false

    const stops = pageStops.value.length ? pageStops.value : [0]
    const currentPos = contentViewMode.value === 'wipe' ? getCurrentWipeOffset() : el.scrollTop
    const currentTop = currentPos + 2
    const currentIndex = Math.max(0, stops.findLastIndex((stop: number) => stop <= currentTop))
    const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1
    const atStart = currentIndex <= 0
    const atEnd = targetIndex >= stops.length

    if (direction === 'next' && atEnd) {
      return contentViewMode.value === 'flow' || contentViewMode.value === 'wipe' ? navigateSibling('next') : false
    }
    if (direction === 'prev' && atStart) {
      return contentViewMode.value === 'flow' || contentViewMode.value === 'wipe' ? navigateSibling('prev') : false
    }

    const targetTop = stops[Math.max(0, Math.min(stops.length - 1, targetIndex))] ?? 0

    if (contentViewMode.value === 'wipe') {
      if (targetTop === getCurrentWipeOffset()) return false
      return moveWithWipe(targetTop, direction)
    }

    if (targetTop === el.scrollTop) return false

    lockPaging()
    el.scrollTo({ top: targetTop, behavior: 'smooth' })
    window.setTimeout(syncPager, Math.min(900, Math.max(260, transitionMs.value)))
    return true
  }

  function handleWheel(event: WheelEvent) {
    if (!isPaged.value || !viewportRef.value) return
    if (contentViewMode.value === 'wipe2') return  // handled by Wipe2Renderer
    if (Math.abs(event.deltaY) < 12) return
    event.preventDefault()
    if (!canMove()) return
    void move(event.deltaY > 0 ? 'next' : 'prev')
  }

  function handleKeydown(event: KeyboardEvent) {
    if (!isPaged.value) return
    if (contentViewMode.value === 'wipe2') return  // handled by Wipe2Renderer
    if (isEditableTarget(event.target)) return
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

  watch([viewportRef, contentViewMode, transitionMs, wipePhase, wipeDirection], () => {
    syncViewportAttrs()
  }, { immediate: true })

  watch(viewportRef, (newEl, oldEl) => {
    reconnectPagerObserver()
    if (oldEl) {
      oldEl.removeEventListener('touchstart', handleTouchStart)
      oldEl.removeEventListener('touchend', handleTouchEnd)
    }
    if (newEl) {
      newEl.addEventListener('touchstart', handleTouchStart, { passive: true })
      newEl.addEventListener('touchend', handleTouchEnd, { passive: true })
    }
  })

  function handleWindowKeydown(event: KeyboardEvent) {
    if (!viewportRef.value || !isPaged.value) return
    handleKeydown(event)
  }

  let touchStartY = 0
  let touchStartX = 0

  function handleTouchStart(e: TouchEvent) {
    touchStartY = e.touches[0].clientY
    touchStartX = e.touches[0].clientX
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!isPaged.value) return
    const deltaY = touchStartY - e.changedTouches[0].clientY
    const deltaX = Math.abs(touchStartX - e.changedTouches[0].clientX)
    // Ignore mostly-horizontal swipes
    if (Math.abs(deltaY) < 40 || deltaX > Math.abs(deltaY) * 0.8) return
    if (!canMove()) return
    void move(deltaY > 0 ? 'next' : 'prev')
  }

  onMounted(() => {
    nextTick(syncPager)
    nextTick(reconnectPagerObserver)
    window.addEventListener('resize', syncPager)
    window.addEventListener('keydown', handleWindowKeydown)
  })

  onBeforeUnmount(() => {
    clearWipeTimers()
    if (pagerSyncFrame) {
      window.cancelAnimationFrame(pagerSyncFrame)
      pagerSyncFrame = 0
    }
    pagerObserver?.disconnect()
    pagerObserver = null
    window.removeEventListener('resize', syncPager)
    window.removeEventListener('keydown', handleWindowKeydown)
    const el = viewportRef.value
    if (el) {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  })

  onBeforeUnmount(() => {
    clearWipeTimers()
    if (pagerSyncFrame) {
      window.cancelAnimationFrame(pagerSyncFrame)
      pagerSyncFrame = 0
    }
    pagerObserver?.disconnect()
    pagerObserver = null
    window.removeEventListener('resize', syncPager)
    window.removeEventListener('keydown', handleWindowKeydown)
    const el = viewportRef.value
    if (el) {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchend', handleTouchEnd)
    }
  })

  return {
    viewportRef,
    contentViewMode,
    isPaged,
    pagerModeLabel,
    pagerNextLabel,
    pageIndex,
    pageCount,
    syncPager,
    updatePageIndexFromScroll,
    move,
    handleWheel,
    handleKeydown,
  }
}
