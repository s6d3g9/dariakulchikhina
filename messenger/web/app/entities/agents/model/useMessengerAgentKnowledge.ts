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

export interface MessengerAgentKnowledgePresetRepository {
  id: string
  label: string
  path: string
}

export interface MessengerAgentKnowledgePresetSource {
  id: string
  label: string
  repositoryId: string
  path: string
  type: 'rag' | 'vector'
  enabled: boolean
}

export interface MessengerAgentKnowledgePreset {
  summary: string
  repositories: MessengerAgentKnowledgePresetRepository[]
  activeRepositoryId: string
  sources: MessengerAgentKnowledgePresetSource[]
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

  async function getPreset(agentId: string) {
    const response = await auth.request<{ preset: MessengerAgentKnowledgePreset }>(`/agents/${agentId}/knowledge/preset`, {
      method: 'GET',
    })

    return response.preset
  }

  return {
    getKnowledge,
    reindexKnowledge,
    getPreset,
  }
}