import type { ComputedRef, Ref } from 'vue'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import type { MessengerKlipyItem } from '../../../entities/messages/model/useMessengerKlipy'

interface UseKlipySearchOptions {
  composerMediaMenuTab: Ref<'emoji' | 'stickers' | 'gif' | 'photo' | 'file'>
  composerMediaMenuOpen: Ref<boolean>
  composerMediaMenuRef: Ref<{
    categoryRailEl: HTMLDivElement | null
    feedEl: HTMLDivElement | null
  } | null>
  activeConversationSecret: ComputedRef<boolean>
  activeKlipyKind: ComputedRef<'gif' | 'sticker' | null>
  sharedKlipyItems: ComputedRef<Record<'gif' | 'sticker', MessengerKlipyItem[]>>
}

export function useKlipySearch(options: UseKlipySearchOptions) {
  const klipy = useMessengerKlipy()

  const klipyQuery = ref('')
  const selectedCatalogCategory = ref('')
  const selectedKlipyItem = ref<MessengerKlipyItem | null>(null)
  const klipyAudienceMode = reactive<{ stickers: 'mine' | 'shared'; gif: 'mine' | 'shared' }>({
    stickers: 'mine',
    gif: 'mine',
  })

  let klipySearchTimer: ReturnType<typeof setTimeout> | null = null
  let klipyFeedLastScrollTop = 0
  let klipyFeedLoadArmed = true
  let klipyFeedLoadCooldownUntil = 0

  const KLIPY_RAIL_PAGE_SIZE = 24

  const composerMediaMenuVisible = computed(() => Boolean(
    options.composerMediaMenuOpen.value
    && !options.activeConversationSecret.value,
  ))

  const activeKlipyAudience = computed<'mine' | 'shared'>(() => {
    if (options.composerMediaMenuTab.value === 'stickers') {
      return klipyAudienceMode.stickers
    }

    if (options.composerMediaMenuTab.value === 'gif') {
      return klipyAudienceMode.gif
    }

    return 'mine'
  })

  const sharedKlipyEnabled = computed(() => !options.activeConversationSecret.value)

  const currentKlipyCategories = computed(() => options.activeKlipyKind.value ? klipy.getCategories(options.activeKlipyKind.value) : [])

  const showKlipyCategories = computed(() => !klipyQuery.value.trim() && currentKlipyCategories.value.length > 0)

  function buildLoopedFeed<T>(items: T[]) {
    if (items.length <= 1) {
      return items
    }

    return [...items, ...items, ...items]
  }

  const loopedKlipyCategories = computed(() => buildLoopedFeed(currentKlipyCategories.value))

  const activeCatalogCategoryLabel = computed(() => {
    if (!selectedCatalogCategory.value) {
      return ''
    }

    return currentKlipyCategories.value.find(item => item.query === selectedCatalogCategory.value)?.category || selectedCatalogCategory.value
  })

  const klipySearchPlaceholder = computed(() => options.composerMediaMenuTab.value === 'stickers' ? 'Поиск стикеров KLIPY' : 'Поиск GIF KLIPY')

  const currentKlipyRecentItems = computed(() => {
    if (!options.activeKlipyKind.value) {
      return []
    }

    if (activeKlipyAudience.value === 'shared') {
      return options.sharedKlipyItems.value[options.activeKlipyKind.value]
    }

    return klipy.getRecentItems(options.activeKlipyKind.value)
  })

  const klipyStatusText = computed(() => {
    if (!klipy.configured.value) {
      return 'KLIPY API не настроен.'
    }

    if (klipy.error.value) {
      return klipy.error.value
    }

    if (klipy.pending.value && !klipy.items.value.length && !currentKlipyRecentItems.value.length) {
      return 'Загружаем...'
    }

    if ((klipyQuery.value.trim() || selectedCatalogCategory.value) && !klipy.pending.value && !klipy.items.value.length) {
      return 'Ничего не найдено.'
    }

    return ''
  })

  const shouldUseRecentKlipyFallback = computed(() => {
    if (activeKlipyAudience.value !== 'mine') {
      return false
    }

    if (klipyQuery.value.trim() || selectedCatalogCategory.value) {
      return false
    }

    return !klipy.items.value.length && (klipy.pending.value || !klipy.hasMore.value)
  })

  const primaryKlipyItems = computed(() => {
    if (activeKlipyAudience.value === 'shared') {
      return options.currentKlipyRecentItems.value
    }

    if (shouldUseRecentKlipyFallback.value && options.currentKlipyRecentItems.value.length) {
      return options.currentKlipyRecentItems.value
    }

    return klipy.items.value
  })

  const canLoadMoreKlipyItems = computed(() => {
    return activeKlipyAudience.value === 'mine' && klipy.hasMore.value
  })

  const showKlipySearchState = computed(() => Boolean(klipyQuery.value.trim() || selectedCatalogCategory.value))

  function scheduleKlipyCatalogLoad() {
    if (klipySearchTimer) {
      clearTimeout(klipySearchTimer)
      klipySearchTimer = null
    }

    if (!composerMediaMenuVisible.value) {
      return
    }

    const kind = options.activeKlipyKind.value
    if (!kind) {
      return
    }

    void klipy.loadCategories(kind)

    klipySearchTimer = setTimeout(() => {
      void klipy.search(klipyQuery.value, kind, {
        category: klipyQuery.value.trim() ? undefined : selectedCatalogCategory.value || undefined,
      })
      klipySearchTimer = null
    }, 180)
  }

  function resetKlipyAudienceMode() {
    klipyAudienceMode.stickers = 'mine'
    klipyAudienceMode.gif = 'mine'
  }

  function resetKlipyFeedPaging() {
    klipyFeedLastScrollTop = 0
    klipyFeedLoadArmed = true
    klipyFeedLoadCooldownUntil = 0
  }

  async function ensureKlipyFeedScrollable() {
    if (!composerMediaMenuVisible.value || activeKlipyAudience.value !== 'mine' || !canLoadMoreKlipyItems.value) {
      return
    }

    const feed = options.composerMediaMenuRef.value?.feedEl
    if (!feed) {
      return
    }

    let attempts = 0
    while (attempts < 4 && canLoadMoreKlipyItems.value && !klipy.pending.value && feed.scrollHeight <= feed.clientHeight + 24) {
      attempts += 1
      await klipy.loadMore(KLIPY_RAIL_PAGE_SIZE)
      await nextTick()
    }
  }

  async function handleLoopedFeedScroll(event: Event, loopedFeedOptions: { looped: boolean; canLoadMore?: boolean; onLoadMore?: () => Promise<void> | void }) {
    const element = event.currentTarget as HTMLElement | null
    if (!element) {
      return
    }

    const currentScrollTop = element.scrollTop
    const isScrollingDown = currentScrollTop >= klipyFeedLastScrollTop - 4
    klipyFeedLastScrollTop = currentScrollTop

    if (loopedFeedOptions.looped) {
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
      loopedFeedOptions.canLoadMore
      && loopedFeedOptions.onLoadMore
      && klipyFeedLoadArmed
      && isScrollingDown
      && remaining <= loadThreshold
      && Date.now() >= klipyFeedLoadCooldownUntil
    ) {
      klipyFeedLoadArmed = false
      klipyFeedLoadCooldownUntil = Date.now() + 280
      await loopedFeedOptions.onLoadMore()
    }
  }

  function formatKlipyCategoryTag(query: string) {
    const normalized = query
      .trim()
      .replace(/^#+/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()

    return normalized ? `#${normalized}` : '#klipy'
  }

  watch([composerMediaMenuVisible, options.composerMediaMenuTab, klipyQuery, selectedCatalogCategory], () => {
    resetKlipyFeedPaging()
    scheduleKlipyCatalogLoad()
  })

  watch(loopedKlipyCategories, async () => {
    await nextTick()
    if (showKlipyCategories.value) {
      options.composerMediaMenuRef.value?.categoryRailEl?.removeAttribute('data-loop-ready')
    }
  })

  watch(primaryKlipyItems, async () => {
    await nextTick()
    options.composerMediaMenuRef.value?.feedEl?.removeAttribute('data-loop-ready')
    await ensureKlipyFeedScrollable()
  })

  watch(() => klipyQuery.value.trim(), (value) => {
    if (value && selectedCatalogCategory.value) {
      selectedCatalogCategory.value = ''
    }
  })

  function cleanup() {
    if (klipySearchTimer) {
      clearTimeout(klipySearchTimer)
      klipySearchTimer = null
    }
  }

  return {
    klipyQuery,
    selectedCatalogCategory,
    selectedKlipyItem,
    klipyAudienceMode,
    composerMediaMenuVisible,
    activeKlipyAudience,
    currentKlipyCategories,
    showKlipyCategories,
    loopedKlipyCategories,
    activeCatalogCategoryLabel,
    klipySearchPlaceholder,
    klipyStatusText,
    currentKlipyRecentItems,
    shouldUseRecentKlipyFallback,
    primaryKlipyItems,
    canLoadMoreKlipyItems,
    showKlipySearchState,
    sharedKlipyEnabled,
    scheduleKlipyCatalogLoad,
    resetKlipyAudienceMode,
    resetKlipyFeedPaging,
    ensureKlipyFeedScrollable,
    handleLoopedFeedScroll,
    formatKlipyCategoryTag,
    cleanup,
  }
}
