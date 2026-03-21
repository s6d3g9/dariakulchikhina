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
    try {
      const response = await auth.request<{ configured: boolean; items: MessengerKlipyItem[] }>('/integrations/klipy/search', {
        method: 'GET',
        query: {
          query: normalizedQuery || undefined,
          category: normalizedQuery ? undefined : normalizedCategory || undefined,
          kind,
          limit: options.limit || 12,
        },
      })

      configured.value = response.configured
      items.value = response.items
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