export interface MessengerKlipyItem {
  id: string
  slug: string
  kind: 'gif' | 'sticker'
  title: string
  previewUrl: string
  originalUrl: string
  mimeType: string
  width?: number
  height?: number
}

export interface MessengerKlipyCategory {
  category: string
  query: string
  previewUrl: string
}

const KLIPY_RECENT_STORAGE_KEY = 'daria-messenger-klipy-recent'

const RU_LAYOUT_TO_EN_MAP: Record<string, string> = {
  й: 'q', ц: 'w', у: 'e', к: 'r', е: 't', н: 'y', г: 'u', ш: 'i', щ: 'o', з: 'p', х: '[', ъ: ']',
  ф: 'a', ы: 's', в: 'd', а: 'f', п: 'g', р: 'h', о: 'j', л: 'k', д: 'l', ж: ';', э: "'",
  я: 'z', ч: 'x', с: 'c', м: 'v', и: 'b', т: 'n', ь: 'm', б: ',', ю: '.', ё: '`',
}

function mapRuLayoutToEn(value: string) {
  return Array.from(value).map((char) => {
    const lower = char.toLowerCase()
    const mapped = RU_LAYOUT_TO_EN_MAP[lower]
    if (!mapped) {
      return char
    }

    return char === lower ? mapped : mapped.toUpperCase()
  }).join('')
}

function buildQueryVariants(query: string) {
  const variants = new Set<string>()
  const normalized = query.trim()
  if (normalized) {
    variants.add(normalized)
    const mappedLayout = mapRuLayoutToEn(normalized)
    if (mappedLayout !== normalized) {
      variants.add(mappedLayout)
    }
  }

  return Array.from(variants)
}

function buildCategoryQueryVariants(query: string, categories: MessengerKlipyCategory[]) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return [] as string[]
  }

  return Array.from(new Set(
    categories
      .filter(category => [category.category, category.query].some(value => value.trim().toLowerCase().includes(normalized)))
      .map(category => category.query.trim())
      .filter(Boolean),
  ))
}

function sanitizeRecentItems(payload: unknown) {
  if (!Array.isArray(payload)) {
    return [] as MessengerKlipyItem[]
  }

  return payload
    .filter((item): item is MessengerKlipyItem => Boolean(
      item
      && typeof item === 'object'
      && 'id' in item
      && 'kind' in item
      && 'previewUrl' in item
      && 'originalUrl' in item,
    ))
    .slice(0, 12)
}

export function useMessengerKlipy() {
  const auth = useMessengerAuth()
  const items = useState<MessengerKlipyItem[]>('messenger-klipy-items', () => [])
  const recentItems = useState<MessengerKlipyItem[]>('messenger-klipy-recent-items', () => [])
  const categories = useState<Record<'gif' | 'sticker', MessengerKlipyCategory[]>>('messenger-klipy-categories', () => ({
    gif: [],
    sticker: [],
  }))
  const pending = useState<boolean>('messenger-klipy-pending', () => false)
  const categoriesPending = useState<boolean>('messenger-klipy-categories-pending', () => false)
  const configured = useState<boolean>('messenger-klipy-configured', () => true)
  const error = useState<string>('messenger-klipy-error', () => '')
  const lastQuery = useState<string>('messenger-klipy-last-query', () => '')
  const lastKind = useState<'gif' | 'sticker'>('messenger-klipy-last-kind', () => 'gif')
  const hydrated = useState<boolean>('messenger-klipy-hydrated', () => false)

  function hydrateRecent() {
    if (hydrated.value || !import.meta.client) {
      return
    }

    try {
      recentItems.value = sanitizeRecentItems(JSON.parse(window.localStorage.getItem(KLIPY_RECENT_STORAGE_KEY) || '[]'))
    } catch {
      recentItems.value = []
    } finally {
      hydrated.value = true
    }
  }

  function persistRecent() {
    if (!import.meta.client) {
      return
    }

    window.localStorage.setItem(KLIPY_RECENT_STORAGE_KEY, JSON.stringify(recentItems.value.slice(0, 12)))
  }

  async function search(query: string, kind: 'gif' | 'sticker', options: { category?: string; limit?: number } = {}) {
    hydrateRecent()
    const normalizedQuery = query.trim()
    const normalizedCategory = options.category?.trim() || ''
    lastQuery.value = normalizedQuery || normalizedCategory
    lastKind.value = kind
    error.value = ''

    pending.value = true
    items.value = []
    try {
      if (!normalizedQuery) {
        const response = await auth.request<{ configured: boolean; items: MessengerKlipyItem[] }>('/integrations/klipy/search', {
          method: 'GET',
          query: {
            category: normalizedCategory || undefined,
            kind,
            limit: options.limit || 12,
          },
        })

        configured.value = response.configured
        items.value = response.items
        return
      }

      if (!categories.value[kind].length && !categoriesPending.value) {
        await loadCategories(kind)
      }

      const variants = Array.from(new Set([
        ...buildCategoryQueryVariants(normalizedQuery, categories.value[kind]),
        ...buildQueryVariants(normalizedQuery),
      ]))
      let configuredFlag = true
      let resolvedItems: MessengerKlipyItem[] = []

      for (const queryVariant of variants) {
        const response = await auth.request<{ configured: boolean; items: MessengerKlipyItem[] }>('/integrations/klipy/search', {
          method: 'GET',
          query: {
            query: queryVariant,
            kind,
            limit: options.limit || 12,
          },
        })

        configuredFlag = response.configured
        if (response.items.length) {
          resolvedItems = response.items
          break
        }
      }

      if (!resolvedItems.length) {
        const fallbackResponse = await auth.request<{ configured: boolean; items: MessengerKlipyItem[] }>('/integrations/klipy/search', {
          method: 'GET',
          query: {
            kind,
            limit: options.limit || 12,
          },
        })

        configuredFlag = fallbackResponse.configured
        resolvedItems = fallbackResponse.items
      }

      configured.value = configuredFlag
      items.value = resolvedItems
    } catch {
      items.value = []
      error.value = 'Не удалось загрузить каталог KLIPY.'
    } finally {
      pending.value = false
    }
  }

  async function loadCategories(kind: 'gif' | 'sticker') {
    if (categories.value[kind].length) {
      return
    }

    categoriesPending.value = true
    error.value = ''
    try {
      const response = await auth.request<{ configured: boolean; categories: MessengerKlipyCategory[] }>('/integrations/klipy/categories', {
        method: 'GET',
        query: {
          kind,
        },
      })

      configured.value = response.configured
      categories.value = {
        ...categories.value,
        [kind]: response.categories,
      }
    } catch {
      categories.value = {
        ...categories.value,
        [kind]: [],
      }
      error.value = 'Не удалось загрузить категории KLIPY.'
    } finally {
      categoriesPending.value = false
    }
  }

  function reset() {
    hydrateRecent()
    items.value = []
    error.value = ''
    lastQuery.value = ''
  }

  function remember(item: MessengerKlipyItem) {
    hydrateRecent()
    recentItems.value = [item, ...recentItems.value.filter(entry => entry.id !== item.id)].slice(0, 12)
    persistRecent()
  }

  function getRecentItems(kind: 'gif' | 'sticker') {
    hydrateRecent()
    return recentItems.value.filter(item => item.kind === kind)
  }

  function getCategories(kind: 'gif' | 'sticker') {
    return categories.value[kind]
  }

  return {
    items,
    recentItems,
    pending,
    categoriesPending,
    configured,
    error,
    lastQuery,
    lastKind,
    search,
    loadCategories,
    reset,
    remember,
    getRecentItems,
    getCategories,
  }
}