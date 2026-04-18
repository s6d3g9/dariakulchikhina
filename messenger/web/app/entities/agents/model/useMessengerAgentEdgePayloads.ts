export interface MessengerAgentEdgePayload {
  sourceAgentId: string
  targetAgentId: string
  mode: 'review' | 'enrich' | 'validate' | 'summarize' | 'route'
  payloadPreview: string
  runId: string
  conversationId?: string
  timestamp: string
}

export function useMessengerAgentEdgePayloads() {
  const auth = useMessengerAuth()
  const edgePayloads = useState<MessengerAgentEdgePayload[]>('messenger-agent-edge-payloads', () => [])
  const pending = useState<boolean>('messenger-agent-edge-payloads-pending', () => false)

  async function refresh(agentId?: string, limit = 24) {
    pending.value = true

    try {
      const response = await auth.request<{ edgePayloads: MessengerAgentEdgePayload[] }>('/agents/edge-payloads', {
        method: 'GET',
        query: {
          agentId,
          limit,
        },
      })

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