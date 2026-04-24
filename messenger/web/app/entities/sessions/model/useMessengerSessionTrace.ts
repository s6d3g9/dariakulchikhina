export interface MessengerSessionTraceEvent {
  eventId: string
  runId: string
  occurredAt: string
  kind: string
  substate: string | null
  tool: string | null
  toolDescriptor: string | null
  tokenIn: number
  tokenOut: number
  message: string | null
  subagentType: string | null
  toolUseId: string | null
  childRunId: string | null
  subagentSuccess: boolean | null
}

export function useMessengerSessionTrace() {
  const api = useAgentsApi()
  const events = ref<MessengerSessionTraceEvent[]>([])
  const pending = ref(false)
  const currentSlug = ref<string | null>(null)
  const error = ref<string | null>(null)

  async function load(slug: string, limit = 100) {
    pending.value = true
    error.value = null
    currentSlug.value = slug
    try {
      const res = await api.getCliSessionTrace(slug, limit)
      // Only commit if we're still viewing the same slug — protects against
      // rapid toggle where a stale response would overwrite newer data.
      if (currentSlug.value === slug) events.value = res.events
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'failed to load trace'
      if (currentSlug.value === slug) events.value = []
    } finally {
      if (currentSlug.value === slug) pending.value = false
    }
  }

  function reset() {
    currentSlug.value = null
    events.value = []
    error.value = null
  }

  return { events, pending, error, currentSlug, load, reset }
}
