export type { MessengerAgentEdgePayload } from '~/shared/types/agent-chat/agent-chat'

export function useMessengerAgentEdgePayloads() {
  const api = useAgentsApi()
  const edgePayloads = useState<MessengerAgentEdgePayload[]>('messenger-agent-edge-payloads', () => [])
  const pending = useState<boolean>('messenger-agent-edge-payloads-pending', () => false)

  async function refresh(agentId?: string, limit = 24) {
    pending.value = true

    try {
      const response = await api.listAgentEdgePayloads(agentId, limit)
      edgePayloads.value = response.edgePayloads
    } finally {
      pending.value = false
    }
  }

  return {
    edgePayloads,
    pending,
    refresh,
  }
}