export interface MessengerProjectAgent {
  id: string
  projectId: string
  type: 'composer' | 'orchestrator' | 'worker' | 'custom'
  name: string
  description?: string
  model?: string
  skillBundleKind?: string
  createdAt: string
  updatedAt: string
}

export function useMessengerProjectAgents(projectId: Ref<string | null>) {
  const api = useProjectsApi()
  const agents = useState<MessengerProjectAgent[]>('messenger-project-agents', () => [])
  const pending = useState<boolean>('messenger-project-agents-pending', () => false)

  async function refresh() {
    if (!projectId.value) return
    pending.value = true
    try {
      const res = await api.listProjectAgents(projectId.value)
      agents.value = res.agents
    } finally {
      pending.value = false
    }
  }

  async function create(input: { type: 'composer' | 'orchestrator' | 'worker' | 'custom'; name?: string; description?: string; model?: string; skillBundleKind?: string }) {
    if (!projectId.value) return
    const res = await api.createProjectAgent(projectId.value, input)
    agents.value = [...agents.value, res.agent]
    return res.agent
  }

  async function remove(agentId: string) {
    if (!projectId.value) return
    await api.deleteProjectAgent(projectId.value, agentId)
    agents.value = agents.value.filter(a => a.id !== agentId)
  }

  return { agents, pending, refresh, create, remove }
}
