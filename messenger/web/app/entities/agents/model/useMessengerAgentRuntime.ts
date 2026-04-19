export type {
  MessengerAgentTraceEvent,
  MessengerAgentRuntimeState,
  MessengerAgentRuntimeTimelineItem,
} from '~/shared/types/agent-chat/agent-chat'

const TRACE_TTL_MS = 6000

export function useMessengerAgentRuntime() {
  const activeRuns = useState<Record<string, MessengerAgentRuntimeState>>('messenger-agent-runtime-active-runs', () => ({}))
  const timeline = useState<MessengerAgentRuntimeTimelineItem[]>('messenger-agent-runtime-timeline', () => [])
  const expireTimers = useState<Record<string, ReturnType<typeof setTimeout>>>('messenger-agent-runtime-expire-timers', () => ({}))

  function clearTimer(agentId: string) {
    if (expireTimers.value[agentId]) {
      clearTimeout(expireTimers.value[agentId])
      delete expireTimers.value[agentId]
    }
  }

  function scheduleExpire(agentId: string) {
    if (!import.meta.client) {
      return
    }

    clearTimer(agentId)
    expireTimers.value[agentId] = setTimeout(() => {
      const nextActiveRuns = { ...activeRuns.value }
      delete nextActiveRuns[agentId]
      activeRuns.value = nextActiveRuns
      clearTimer(agentId)
    }, TRACE_TTL_MS)
  }

  function handleTraceEvent(event: MessengerAgentTraceEvent) {
    const nextState: MessengerAgentRuntimeState = {
      runId: event.trace.runId,
      agentId: event.trace.agentId,
      conversationId: event.conversationId,
      phase: event.trace.phase,
      status: event.trace.status,
      summary: event.trace.summary,
      focus: event.trace.focus || '',
      activeTargetAgentIds: [...(event.trace.activeTargetAgentIds || [])],
      activeConnections: [...(event.trace.activeConnections || [])],
      fileNames: [...(event.trace.fileNames || [])],
      artifacts: [...(event.trace.artifacts || [])],
      updatedAt: event.trace.timestamp,
    }

    activeRuns.value = {
      ...activeRuns.value,
      [event.trace.agentId]: nextState,
    }

    timeline.value = [
      nextState,
      ...timeline.value.filter(item => !(item.runId === nextState.runId && item.phase === nextState.phase)),
    ].slice(0, 24)

    if (event.trace.status === 'completed' || event.trace.status === 'failed') {
      scheduleExpire(event.trace.agentId)
    } else {
      clearTimer(event.trace.agentId)
    }
  }

  function reset() {
    for (const agentId of Object.keys(expireTimers.value)) {
      clearTimer(agentId)
    }

    activeRuns.value = {}
    timeline.value = []
  }

  return {
    activeRuns,
    timeline,
    handleTraceEvent,
    reset,
  }
}