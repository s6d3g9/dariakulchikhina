export interface KlipySearchResponse {
  configured: boolean
  items: Array<{
    id: string
    slug: string
    kind: 'gif' | 'sticker'
    title: string
    previewUrl: string
    originalUrl: string
    mimeType: string
    width?: number
    height?: number
  }>
}

export interface KlipyCategoriesResponse {
  configured: boolean
  categories: Array<{
    category: string
    query: string
    previewUrl: string
  }>
}

interface KlipySearchQuery {
  query?: string
  category?: string
  kind: 'gif' | 'sticker'
  limit: number
  page: number
}

interface KlipyCategoriesQuery {
  kind: 'gif' | 'sticker'
}

interface KlipyMediaQuery {
  url: string
}

export const useKlipyApi = () => {
  const auth = useMessengerAuth()

  async function search(query: KlipySearchQuery) {
    return await auth.request<KlipySearchResponse>('/integrations/klipy/search', {
      method: 'GET',
      query: {
        query: query.query,
        category: query.category,
        kind: query.kind,
        limit: query.limit,
        page: query.page,
      },
    })
  }

  async function getCategories(kind: 'gif' | 'sticker') {
    return await auth.request<KlipyCategoriesResponse>('/integrations/klipy/categories', {
      method: 'GET',
      query: {
        kind,
      },
    })
  }

  async function getMedia(url: string) {
    return await auth.request<Blob>('/integrations/klipy/media', {
      method: 'GET',
      query: {
        url,
      },
      responseType: 'blob',
    })
  }

  return {
    search,
    getCategories,
    getMedia,
  }
}
