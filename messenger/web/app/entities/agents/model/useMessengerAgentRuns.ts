export type {
  MessengerAgentRunArtifact,
  MessengerAgentRunEvent,
  MessengerAgentRun,
} from '~/shared/types/agent-chat/agent-chat'

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