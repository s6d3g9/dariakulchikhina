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
  const api = useAgentsApi()

  async function getKnowledge(agentId: string) {
    const response = await api.getAgentKnowledge(agentId)
    return response.knowledge
  }

  async function reindexKnowledge(agentId: string) {
    const response = await api.postAgentKnowledgeReindex(agentId)
    return response.knowledge
  }

  async function getPreset(agentId: string) {
    const response = await api.getAgentKnowledgePreset(agentId)
    return response.preset
  }

  return {
    getKnowledge,
    reindexKnowledge,
    getPreset,
  }
}