export interface MessengerAgentKnowledgeStatusItem {
  id: string
  label: string
  repositoryId: string
  path: string
  type: 'rag' | 'vector'
  enabled: boolean
  indexed: boolean
  chunkCount: number
  indexedAt: string | null
  error: string | null
}

export interface MessengerAgentKnowledgeStatus {
  ready: boolean
  indexedSources: number
  indexedChunks: number
  lastIndexedAt: string | null
  sources: MessengerAgentKnowledgeStatusItem[]
}

export function useMessengerAgentKnowledge() {
  const auth = useMessengerAuth()

  async function getKnowledge(agentId: string) {
    const response = await auth.request<{ knowledge: MessengerAgentKnowledgeStatus }>(`/agents/${agentId}/knowledge`, {
      method: 'GET',
    })

    return response.knowledge
  }

  async function reindexKnowledge(agentId: string) {
    const response = await auth.request<{ knowledge: MessengerAgentKnowledgeStatus }>(`/agents/${agentId}/knowledge/reindex`, {
      method: 'POST',
    })

    return response.knowledge
  }

  return {
    getKnowledge,
    reindexKnowledge,
  }
}