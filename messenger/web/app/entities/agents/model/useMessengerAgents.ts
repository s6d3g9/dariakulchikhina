export type MessengerAgentConnectionMode = 'review' | 'enrich' | 'validate' | 'summarize' | 'route'
type MessengerAgentKnowledgeSourceType = 'rag' | 'vector'

export interface MessengerAgentConnection {
  targetAgentId: string
  mode: MessengerAgentConnectionMode
}

export type MessengerAgentRepositoryType = 'ssh' | 'github' | 'gitlab' | 'bitbucket' | 'local' | 'custom'

export interface MessengerAgentRepository {
  id: string
  label: string
  path: string
  type: MessengerAgentRepositoryType
  url?: string
  owner?: string
  repo?: string
  branch?: string
  token?: string
  instanceUrl?: string
  protocol?: string
  credentials?: string
}

export interface MessengerAgentKnowledgeSource {
  id: string
  label: string
  repositoryId: string
  path: string
  type: MessengerAgentKnowledgeSourceType
  enabled: boolean
}

export type MessengerAgentEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface MessengerAgentSettings {
  agentId: string
  subscriptionId: string
  model: string
  effort: MessengerAgentEffort
  apiKey: string
  ssh: {
    host: string
    login: string
    port: number
    privateKey: string
    workspacePath: string
    repositories: MessengerAgentRepository[]
    activeRepositoryId: string
  }
  knowledge: {
    sources: MessengerAgentKnowledgeSource[]
  }
  connections: MessengerAgentConnection[]
  graphPosition: {
    x: number
    y: number
  }
  updatedAt: string
  apiKeyConfigured: boolean
  sshConfigured: boolean
}

export interface MessengerAgentItem {
  id: string
  login: string
  displayName: string
  description: string
  greeting: string
  prompts: string[]
  modelOptions: string[]
  settings: MessengerAgentSettings
  conversationId: string | null
}

export interface MessengerAgentGraphNodeInput {
  connections: MessengerAgentConnection[]
  graphPosition: {
    x: number
    y: number
  }
}

export function useMessengerAgents() {
  const api = useAgentsApi()
  const agents = useState<MessengerAgentItem[]>('messenger-agents-list', () => [])
  const pending = useState<boolean>('messenger-agents-pending', () => false)
  const settingsPending = useState<boolean>('messenger-agents-settings-pending', () => false)

  async function refresh() {
    pending.value = true

    try {
      const response = await api.listAgents()
      agents.value = response.agents
    } finally {
      pending.value = false
    }
  }

  async function saveSettings(agentId: string, payload: Pick<MessengerAgentSettings, 'subscriptionId' | 'model' | 'effort' | 'apiKey' | 'ssh' | 'knowledge' | 'connections' | 'graphPosition'>) {
    settingsPending.value = true

    try {
      const response = await api.putAgentSettings(agentId, payload)

      agents.value = agents.value.map(agent => agent.id === agentId
        ? {
            ...agent,
            settings: response.settings,
          }
        : agent)

      return response.settings
    } finally {
      settingsPending.value = false
    }
  }

  async function saveGraph(graph: Record<string, MessengerAgentGraphNodeInput>) {
    settingsPending.value = true

    try {
      const response = await api.putAgentGraph(graph)

      const updates = response.settings

      agents.value = agents.value.map((agent) => {
        const updated = updates.find(item => item.agentId === agent.id)
        return updated
          ? {
              ...agent,
              settings: updated,
            }
          : agent
      })
    } finally {
      settingsPending.value = false
    }
  }

  return {
    agents,
    pending,
    settingsPending,
    refresh,
    saveSettings,
    saveGraph,
  }
}