export interface MessengerAgentRunArtifact {
  kind: 'consultation' | 'file' | 'summary'
  label: string
  content: string
  agentId?: string
}

export interface MessengerAgentRunEvent {
  phase: 'started' | 'context' | 'files' | 'consulting' | 'reasoning' | 'completed' | 'failed'
  status: 'running' | 'completed' | 'failed'
  summary: string
  focus?: string
  activeTargetAgentIds: string[]
  fileNames: string[]
  artifacts: MessengerAgentRunArtifact[]
  timestamp: string
}

export interface MessengerAgentRun {
  runId: string
  conversationId?: string
  agentId: string
  status: 'running' | 'completed' | 'failed'
  parentRunId?: string
  rootRunId?: string
  isSubagent?: boolean
  costUsd?: number
  tokenInTotal?: number
  tokenOutTotal?: number
  model?: string
  substate?: string
  startedAt: string
  updatedAt: string
  events: MessengerAgentRunEvent[]
}

export function useMessengerAgentRuns() {
  const api = useAgentsApi()
  const runs = useState<MessengerAgentRun[]>('messenger-agent-runs', () => [])
  const selectedRun = useState<MessengerAgentRun | null>('messenger-agent-selected-run', () => null)
  const pending = useState<boolean>('messenger-agent-runs-pending', () => false)

  async function refresh(agentId?: string, limit = 10) {
    pending.value = true

    try {
      const response = await api.listAgentRuns(agentId, limit)

      runs.value = response.runs
      if (selectedRun.value) {
        selectedRun.value = response.runs.find(item => item.runId === selectedRun.value?.runId) || selectedRun.value
      }
    } finally {
      pending.value = false
    }
  }

  async function openRun(runId: string) {
    pending.value = true

    try {
      const response = await api.getAgentRun(runId)

      selectedRun.value = response.run
      return response.run
    } finally {
      pending.value = false
    }
  }

  function clearSelection() {
    selectedRun.value = null
  }

  return {
    runs,
    selectedRun,
    pending,
    refresh,
    openRun,
    clearSelection,
  }
}