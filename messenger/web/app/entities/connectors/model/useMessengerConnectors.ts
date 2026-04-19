export interface MessengerConnector {
  id: string
  projectId: string
  type: string
  label: string
  config: Record<string, unknown>
  enabled: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export function useMessengerConnectors(projectId: Ref<string | null>) {
  const api = useProjectsApi()
  const connectors = useState<MessengerConnector[]>('messenger-connectors', () => [])
  const pending = useState<boolean>('messenger-connectors-pending', () => false)

  async function refresh() {
    if (!projectId.value) return
    pending.value = true
    try {
      const res = await api.listConnectors(projectId.value)
      connectors.value = res.connectors
    }
    finally {
      pending.value = false
    }
  }

  async function create(input: { type: string; label: string; config?: Record<string, unknown>; enabled?: boolean; isDefault?: boolean }) {
    if (!projectId.value) return
    const res = await api.createConnector(projectId.value, input)
    connectors.value = [...connectors.value, res.connector]
    return res.connector
  }

  async function update(entryId: string, input: Partial<{ type: string; label: string; config: Record<string, unknown>; enabled: boolean; isDefault: boolean }>) {
    if (!projectId.value) return
    const res = await api.updateConnector(projectId.value, entryId, input)
    connectors.value = connectors.value.map(c => c.id === entryId ? res.connector : c)
    return res.connector
  }

  async function remove(entryId: string) {
    if (!projectId.value) return
    await api.deleteConnector(projectId.value, entryId)
    connectors.value = connectors.value.filter(c => c.id !== entryId)
  }

  return { connectors, pending, refresh, create, update, remove }
}
