export interface MessengerMcpServer {
  id: string
  projectId: string
  name: string
  transport: 'http' | 'stdio' | 'sse'
  endpoint: string
  config: Record<string, unknown>
  enabled: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export type McpHealthStatus = 'ok' | 'error' | 'unreachable' | 'pending' | 'idle'

export interface McpPingResult {
  status: 'ok' | 'error' | 'unreachable'
  httpStatus?: number
  message?: string
}

export function useMessengerMcp(projectId: Ref<string | null>) {
  const api = useProjectsApi()
  const servers = useState<MessengerMcpServer[]>('messenger-mcp-servers', () => [])
  const pending = useState<boolean>('messenger-mcp-pending', () => false)
  const healthMap = useState<Record<string, McpHealthStatus>>('messenger-mcp-health', () => ({}))
  const pingPending = useState<Record<string, boolean>>('messenger-mcp-ping-pending', () => ({}))

  async function refresh() {
    if (!projectId.value) return
    pending.value = true
    try {
      const res = await api.listMcpServers(projectId.value)
      servers.value = res.servers
    } finally {
      pending.value = false
    }
  }

  async function create(input: { name: string; transport: string; endpoint: string; config?: Record<string, unknown>; enabled?: boolean }) {
    if (!projectId.value) return
    const res = await api.createMcpServer(projectId.value, input)
    servers.value = [...servers.value, res.server]
    return res.server
  }

  async function update(entryId: string, input: Partial<{ name: string; transport: string; endpoint: string; config: Record<string, unknown>; enabled: boolean }>) {
    if (!projectId.value) return
    const res = await api.updateMcpServer(projectId.value, entryId, input)
    servers.value = servers.value.map(s => s.id === entryId ? res.server : s)
    return res.server
  }

  async function remove(entryId: string) {
    if (!projectId.value) return
    await api.deleteMcpServer(projectId.value, entryId)
    servers.value = servers.value.filter(s => s.id !== entryId)
    const next = { ...healthMap.value }
    delete next[entryId]
    healthMap.value = next
  }

  async function ping(entryId: string) {
    if (!projectId.value) return
    pingPending.value = { ...pingPending.value, [entryId]: true }
    healthMap.value = { ...healthMap.value, [entryId]: 'pending' }
    try {
      const result = await api.pingMcpServer(projectId.value, entryId)
      healthMap.value = { ...healthMap.value, [entryId]: result.status }
    } catch {
      healthMap.value = { ...healthMap.value, [entryId]: 'unreachable' }
    } finally {
      pingPending.value = { ...pingPending.value, [entryId]: false }
    }
  }

  return { servers, pending, healthMap, pingPending, refresh, create, update, remove, ping }
}
