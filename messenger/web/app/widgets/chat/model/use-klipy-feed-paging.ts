let klipyFeedLastScrollTop = 0
let klipyFeedLoadArmed = true
let klipyFeedLoadCooldownUntil = 0

export function useKlipyFeedPaging() {
  function resetKlipyFeedPaging() {
    klipyFeedLastScrollTop = 0
    klipyFeedLoadArmed = true
    klipyFeedLoadCooldownUntil = 0
  }

  function buildLoopedFeed<T>(items: T[]) {
    if (items.length <= 1) {
      return items
    }

    return [...items, ...items, ...items]
  }

  function primeLoopedRailPosition(element: HTMLElement | null) {
    if (!element || element.dataset.loopReady === 'true') {
      return
    }

    const segmentWidth = element.scrollWidth / 3
    if (!segmentWidth) {
      return
    }

    element.scrollLeft = segmentWidth
    element.dataset.loopReady = 'true'
  }

  function primeLoopedFeedPosition(element: HTMLElement | null) {
    if (!element || element.dataset.loopReady === 'true') {
      return
    }

    const segmentHeight = element.scrollHeight / 3
    if (!segmentHeight) {
      return
    }

    element.scrollTop = segmentHeight
    element.dataset.loopReady = 'true'
  }

  async function handleLoopedRailScroll(event: Event, options: { looped: boolean; canLoadMore?: boolean; onLoadMore?: () => Promise<void> | void }) {
    const element = event.currentTarget as HTMLElement | null
    if (!element) {
      return
    }

    if (options.looped) {
      const segmentWidth = element.scrollWidth / 3
      if (segmentWidth > 0) {
        if (element.scrollLeft < segmentWidth * 0.35) {
          element.scrollLeft += segmentWidth
        } else if (element.scrollLeft > segmentWidth * 1.65) {
          element.scrollLeft -= segmentWidth
        }
      }
    }

    const remaining = element.scrollWidth - element.clientWidth - element.scrollLeft
    if (options.canLoadMore && remaining < 320 && options.onLoadMore) {
      await options.onLoadMore()
    }
  }

  async function handleLoopedFeedScroll(event: Event, options: { looped: boolean; canLoadMore?: boolean; onLoadMore?: () => Promise<void> | void }) {
    const element = event.currentTarget as HTMLElement | null
    if (!element) {
      return
    }

    const currentScrollTop = element.scrollTop
    const isScrollingDown = currentScrollTop >= klipyFeedLastScrollTop - 4
    klipyFeedLastScrollTop = currentScrollTop

    if (options.looped) {
      const segmentHeight = element.scrollHeight / 3
      if (segmentHeight > 0) {
        if (element.scrollTop < segmentHeight * 0.35) {
          element.scrollTop += segmentHeight
        } else if (element.scrollTop > segmentHeight * 1.65) {
          element.scrollTop -= segmentHeight
        }
      }
    }

    const remaining = element.scrollHeight - element.clientHeight - element.scrollTop
    const loadThreshold = Math.max(120, Math.min(220, element.clientHeight * 0.38))

    if (remaining > loadThreshold * 1.6) {
      klipyFeedLoadArmed = true
    }

    if (
      options.canLoadMore
      && options.onLoadMore
      && klipyFeedLoadArmed
      && isScrollingDown
      && remaining <= loadThreshold
      && Date.now() >= klipyFeedLoadCooldownUntil
    ) {
      klipyFeedLoadArmed = false
      klipyFeedLoadCooldownUntil = Date.now() + 280
      await options.onLoadMore()
    }
  }

  return {
    resetKlipyFeedPaging,
    buildLoopedFeed,
    primeLoopedRailPosition,
    primeLoopedFeedPosition,
    handleLoopedRailScroll,
    handleLoopedFeedScroll,
  }
}
