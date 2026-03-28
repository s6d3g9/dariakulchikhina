export type MessengerAgentConnectionMode = 'review' | 'enrich' | 'validate' | 'summarize' | 'route'

export interface MessengerAgentConnection {
  targetAgentId: string
  mode: MessengerAgentConnectionMode
}

export interface MessengerAgentSettings {
  agentId: string
  model: string
  apiKey: string
  ssh: {
    host: string
    login: string
    port: number
    privateKey: string
    workspacePath: string
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
  const auth = useMessengerAuth()
  const agents = useState<MessengerAgentItem[]>('messenger-agents-list', () => [])
  const pending = useState<boolean>('messenger-agents-pending', () => false)
  const settingsPending = useState<boolean>('messenger-agents-settings-pending', () => false)

  async function refresh() {
    pending.value = true

    try {
      const response = await auth.request<{ agents: MessengerAgentItem[] }>('/agents', {
        method: 'GET',
      })
      agents.value = response.agents
    } finally {
      pending.value = false
    }
  }

  async function saveSettings(agentId: string, payload: Pick<MessengerAgentSettings, 'model' | 'apiKey' | 'ssh' | 'connections' | 'graphPosition'>) {
    settingsPending.value = true

    try {
      const response = await auth.request<{ settings: MessengerAgentSettings }>(`/agents/${agentId}/settings`, {
        method: 'PUT',
        body: payload,
      })

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
      const response = await auth.request<{ settings: MessengerAgentSettings[] }>('/agents/graph', {
        method: 'PUT',
        body: {
          graph,
        },
      })

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