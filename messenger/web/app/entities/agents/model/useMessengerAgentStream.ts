import type { Ref } from 'vue'
import { buildMessengerWsUrl } from '../../../utils/messenger-url'

export type AgentSubstate = 'idle' | 'thinking' | 'tool_call' | 'awaiting_input' | 'streaming' | 'error'

interface AgentStreamEvent {
  type: 'run_start' | 'substate' | 'delta' | 'tool_use' | 'tokens' | 'complete' | 'error'
  runId?: string
  substate?: AgentSubstate
  // delta event field (new IngestEvent schema, was `text` before fix-ws-stream)
  delta?: string
  // tool_use event fields
  tool?: string
  input?: unknown
  // tokens event fields
  tokenIn?: number
  tokenOut?: number
  costUsd?: number
  cacheRead?: number
  cacheWrite?: number
  // error event field
  message?: string
  // complete event field
  finalText?: string
  // run_start may carry a prompt excerpt from the ingest payload
  prompt?: string
}

export interface AgentToolUseEntry {
  tool: string
  descriptor: string
  at: number
  endAt?: number
  input?: Record<string, unknown>
}

export interface RunState {
  substate: AgentSubstate
  streamingDraft: string
  toolUses: AgentToolUseEntry[]
  tokenCount: { input: number; output: number; total: number; contextPct: number; cacheRead: number; cacheWrite: number }
  costUsd: number
  startedAt: number
  lastEventAt: number
  errors: string[]
  status: 'active' | 'completed' | 'error'
  promptExcerpt: string
}

export interface ActiveRun {
  runId: string
  state: RunState
}

const CONTEXT_WINDOW = 200_000
const COMPLETED_RUN_TTL_MS = 30_000
// Fallback key for events that carry no runId (pre-W2 backend)
const DEFAULT_RUN_KEY = '__default__'

export function useMessengerAgentStream(agentId: Ref<string>) {
  const config = useRuntimeConfig()
  const auth = useMessengerAuth()

  // Per-run state — reactive Map so computed() tracks Map mutations
  const runStates = reactive(new Map<string, RunState>())
  const cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>()

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let boundAgentId = ''

  function makeRunState(promptExcerpt = ''): RunState {
    return {
      substate: 'idle',
      streamingDraft: '',
      toolUses: [],
      tokenCount: { input: 0, output: 0, total: 0, contextPct: 0, cacheRead: 0, cacheWrite: 0 },
      costUsd: 0,
      startedAt: Date.now(),
      lastEventAt: Date.now(),
      errors: [],
      status: 'active',
      promptExcerpt,
    }
  }

  function getOrCreateRun(runId: string): RunState {
    if (!runStates.has(runId)) {
      runStates.set(runId, makeRunState())
    }
    return runStates.get(runId)!
  }

  function scheduleCleanup(runId: string) {
    if (cleanupTimers.has(runId)) clearTimeout(cleanupTimers.get(runId)!)
    cleanupTimers.set(runId, setTimeout(() => {
      cleanupTimers.delete(runId)
      runStates.delete(runId)
    }, COMPLETED_RUN_TTL_MS))
  }

  // ── Backward-compat computed refs ────────────────────────────────────────
  // Derive from the most-recently-active run so single-run agents are unchanged.
  const primaryRunState = computed<RunState | null>(() => {
    let latest: RunState | null = null
    for (const rs of runStates.values()) {
      if (rs.status === 'active') {
        if (!latest || rs.lastEventAt > latest.lastEventAt) latest = rs
      }
    }
    if (latest) return latest
    // Fallback to any run for done-trace display
    for (const rs of runStates.values()) {
      if (!latest || rs.lastEventAt > latest.lastEventAt) latest = rs
    }
    return latest
  })

  const substate = computed(() => primaryRunState.value?.substate ?? 'idle')
  const tokenCount = computed(() => primaryRunState.value?.tokenCount ?? { input: 0, output: 0, total: 0, contextPct: 0, cacheRead: 0, cacheWrite: 0 })
  const costUsd = computed(() => primaryRunState.value?.costUsd ?? 0)
  const streamingDraft = computed(() => primaryRunState.value?.streamingDraft ?? '')
  const toolUses = computed(() => primaryRunState.value?.toolUses ?? [])
  const runStartedAt = computed(() => primaryRunState.value?.startedAt ?? 0)
  const errors = computed(() => primaryRunState.value?.errors ?? [])

  // All currently active runs sorted by start time (for multi-run panel)
  const activeRuns = computed<ActiveRun[]>(() => {
    const result: ActiveRun[] = []
    for (const [runId, state] of runStates.entries()) {
      if (state.status === 'active') result.push({ runId, state })
    }
    return result.sort((a, b) => a.state.startedAt - b.state.startedAt)
  })

  function getRunState(runId: string): RunState | null {
    return runStates.get(runId) ?? null
  }

  // ── WebSocket plumbing ───────────────────────────────────────────────────
  function teardown() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (ws) { ws.close(); ws = null }
  }

  function handleEvent(event: AgentStreamEvent) {
    const runId = event.runId || DEFAULT_RUN_KEY

    if (event.type === 'run_start') {
      if (cleanupTimers.has(runId)) { clearTimeout(cleanupTimers.get(runId)!); cleanupTimers.delete(runId) }
      const excerpt = typeof event.prompt === 'string' ? event.prompt.slice(0, 80) : ''
      runStates.set(runId, makeRunState(excerpt))
      return
    }

    const rs = getOrCreateRun(runId)
    rs.lastEventAt = Date.now()

    if (event.type === 'substate' && event.substate) {
      rs.substate = event.substate
      return
    }

    if (event.type === 'delta' && event.delta) {
      rs.streamingDraft += event.delta
      if (rs.substate !== 'streaming') rs.substate = 'streaming'
      return
    }

    if (event.type === 'tool_use' && event.tool) {
      const input = event.input as Record<string, unknown> | undefined
      const descriptor =
        typeof input?.command === 'string'     ? String(input.command).slice(0, 140) :
        typeof input?.file_path === 'string'   ? String(input.file_path) :
        typeof input?.path === 'string'        ? String(input.path) :
        typeof input?.pattern === 'string'     ? String(input.pattern).slice(0, 100) :
        typeof input?.url === 'string'         ? String(input.url).slice(0, 100) :
        typeof input?.prompt === 'string'      ? String(input.prompt).slice(0, 100) :
        typeof input?.description === 'string' ? String(input.description).slice(0, 100) :
        ''
      const now = Date.now()
      const prev = rs.toolUses.length > 0 ? rs.toolUses[rs.toolUses.length - 1] : null
      if (prev && !prev.endAt) prev.endAt = now
      rs.toolUses.push({ tool: event.tool, descriptor, at: now })
      rs.substate = 'tool_call'
      return
    }

    if (event.type === 'tokens') {
      const input = event.tokenIn ?? rs.tokenCount.input
      const output = event.tokenOut ?? rs.tokenCount.output
      const total = input + output
      rs.tokenCount = {
        input,
        output,
        total,
        contextPct: Math.min(100, Math.round((total / CONTEXT_WINDOW) * 100)),
        cacheRead: event.cacheRead ?? rs.tokenCount.cacheRead,
        cacheWrite: event.cacheWrite ?? rs.tokenCount.cacheWrite,
      }
      if (event.costUsd !== undefined) rs.costUsd = event.costUsd
      return
    }

    if (event.type === 'complete') {
      rs.substate = 'idle'
      rs.streamingDraft = ''
      rs.status = 'completed'
      if (rs.toolUses.length > 0) {
        const last = rs.toolUses[rs.toolUses.length - 1]
        if (!last.endAt) last.endAt = Date.now()
      }
      scheduleCleanup(runId)
      return
    }

    if (event.type === 'error') {
      if (rs.toolUses.length > 0) {
        const last = rs.toolUses[rs.toolUses.length - 1]
        if (!last.endAt) last.endAt = Date.now()
      }
      rs.substate = 'error'
      rs.status = 'error'
      rs.errors.push(event.message || 'Unknown stream error')
      rs.streamingDraft = ''
      scheduleCleanup(runId)
    }
  }

  function scheduleReconnect() {
    if (!import.meta.client || reconnectTimer || !auth.token.value || boundAgentId !== agentId.value) return
    reconnectTimer = setTimeout(() => { reconnectTimer = null; connect() }, 1500)
  }

  function connect() {
    if (!import.meta.client || !auth.token.value || !agentId.value) return
    teardown()
    boundAgentId = agentId.value

    const wsUrl = buildMessengerWsUrl(
      config.public.messengerCoreBaseUrl,
      `/ws/agents/${agentId.value}/stream`,
    )
    wsUrl.searchParams.set('token', auth.token.value)

    const socket = new WebSocket(wsUrl.toString())
    ws = socket

    socket.addEventListener('message', (msg) => {
      try {
        const event = JSON.parse(String(msg.data)) as AgentStreamEvent
        handleEvent(event)
      } catch {
        // ignore malformed frames
      }
    })

    socket.addEventListener('close', () => {
      if (ws === socket) { ws = null; scheduleReconnect() }
    })

    socket.addEventListener('error', () => {
      if (ws === socket) { ws = null; scheduleReconnect() }
    })
  }

  async function cancel() {
    try {
      await auth.request(`/agents/${agentId.value}/cancel`, { method: 'POST' })
    } catch {
      // TODO: wm4 will wire the cancel endpoint
      console.warn('cancel not wired')
    }
  }

  watch(agentId, (id) => {
    if (id) {
      connect()
    } else {
      teardown()
      runStates.clear()
    }
  }, { immediate: true })

  onUnmounted(() => {
    teardown()
    for (const timer of cleanupTimers.values()) clearTimeout(timer)
    cleanupTimers.clear()
  })

  return {
    // Backward-compat flat refs (derived from the primary / most-recent active run)
    substate,
    tokenCount,
    costUsd,
    streamingDraft,
    toolUses,
    runStartedAt,
    errors,
    // Multi-run API
    activeRuns,
    getRunState,
    // Actions
    cancel,
  }
}
