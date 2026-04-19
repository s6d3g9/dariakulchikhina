export interface MessengerExternalApi {
  id: string
  projectId: string
  name: string
  baseUrl: string
  openapiRef: string | null
  authType: 'none' | 'bearer' | 'basic' | 'header'
  config: Record<string, unknown>
  enabled: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export function validateExternalApiBaseUrl(value: string): string | null {
  if (!value) return 'URL обязателен'
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'URL должен начинаться с http:// или https://'
    }
    return null
  } catch {
    return 'Некорректный URL'
  }
}

export function useMessengerExternalApis(projectId: Ref<string | null>) {
  const api = useProjectsApi()
  const apis = useState<MessengerExternalApi[]>('messenger-external-apis', () => [])
  const pending = useState<boolean>('messenger-external-apis-pending', () => false)

  async function refresh() {
    if (!projectId.value) return
    pending.value = true
    try {
      const res = await api.listExternalApis(projectId.value)
      apis.value = res.apis
    } finally {
      pending.value = false
    }
  }

  async function create(input: { name: string; baseUrl: string; openapiRef?: string; authType?: string; config?: Record<string, unknown>; enabled?: boolean }) {
    if (!projectId.value) return
    const res = await api.createExternalApi(projectId.value, input)
    apis.value = [...apis.value, res.api]
    return res.api
  }

  async function update(entryId: string, input: Partial<{ name: string; baseUrl: string; openapiRef: string; authType: string; config: Record<string, unknown>; enabled: boolean }>) {
    if (!projectId.value) return
    const res = await api.updateExternalApi(projectId.value, entryId, input)
    apis.value = apis.value.map(a => a.id === entryId ? res.api : a)
    return res.api
  }

  async function remove(entryId: string) {
    if (!projectId.value) return
    await api.deleteExternalApi(projectId.value, entryId)
    apis.value = apis.value.filter(a => a.id !== entryId)
  }

  return { apis, pending, refresh, create, update, remove }
}
