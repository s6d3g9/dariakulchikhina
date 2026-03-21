export interface MessengerGiphyItem {
  id: string
  kind: 'gif' | 'sticker'
  title: string
  previewUrl: string
  originalUrl: string
  mimeType: string
  width?: number
  height?: number
  username?: string
  rating?: string
}

const GIPHY_RECENT_STORAGE_KEY = 'daria-messenger-giphy-recent'

function sanitizeRecentItems(payload: unknown) {
  if (!Array.isArray(payload)) {
    return [] as MessengerGiphyItem[]
  }

  return payload
    .filter((item): item is MessengerGiphyItem => Boolean(
      item
      && typeof item === 'object'
      && 'id' in item
      && 'kind' in item
      && 'previewUrl' in item
      && 'originalUrl' in item,
    ))
    .slice(0, 12)
}

export function useMessengerGiphy() {
  const auth = useMessengerAuth()
  const items = useState<MessengerGiphyItem[]>('messenger-giphy-items', () => [])
  const recentItems = useState<MessengerGiphyItem[]>('messenger-giphy-recent-items', () => [])
  const pending = useState<boolean>('messenger-giphy-pending', () => false)
  const configured = useState<boolean>('messenger-giphy-configured', () => true)
  const error = useState<string>('messenger-giphy-error', () => '')
  const lastQuery = useState<string>('messenger-giphy-last-query', () => '')
  const lastKind = useState<'gif' | 'sticker'>('messenger-giphy-last-kind', () => 'gif')
  const hydrated = useState<boolean>('messenger-giphy-hydrated', () => false)

  function hydrateRecent() {
    if (hydrated.value || !import.meta.client) {
      return
    }

    try {
      recentItems.value = sanitizeRecentItems(JSON.parse(window.localStorage.getItem(GIPHY_RECENT_STORAGE_KEY) || '[]'))
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

    window.localStorage.setItem(GIPHY_RECENT_STORAGE_KEY, JSON.stringify(recentItems.value.slice(0, 12)))
  }

  async function search(query: string, kind: 'gif' | 'sticker', limit = 12) {
    hydrateRecent()
    const normalizedQuery = query.trim()
    lastQuery.value = normalizedQuery
    lastKind.value = kind
    error.value = ''

    pending.value = true
    try {
      const response = await auth.request<{ configured: boolean; items: MessengerGiphyItem[] }>('/integrations/giphy/search', {
        method: 'GET',
        query: {
          query: normalizedQuery,
          kind,
          limit,
        },
      })

      configured.value = response.configured
      items.value = response.items
    } catch {
      items.value = []
      error.value = 'Не удалось загрузить GIPHY.'
    } finally {
      pending.value = false
    }
  }

  function reset() {
    hydrateRecent()
    items.value = []
    error.value = ''
    lastQuery.value = ''
  }

  function remember(item: MessengerGiphyItem) {
    hydrateRecent()
    recentItems.value = [item, ...recentItems.value.filter(entry => entry.id !== item.id)].slice(0, 12)
    persistRecent()
  }

  function getRecentItems(kind: 'gif' | 'sticker') {
    hydrateRecent()
    return recentItems.value.filter(item => item.kind === kind)
  }

  return {
    items,
    recentItems,
    pending,
    configured,
    error,
    lastQuery,
    lastKind,
    search,
    reset,
    remember,
    getRecentItems,
  }
}
