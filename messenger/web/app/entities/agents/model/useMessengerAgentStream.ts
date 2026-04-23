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
}

export interface AgentToolUseEntry {
  tool: string
  descriptor: string
  at: number
  endAt?: number
  input?: Record<string, unknown>
}

const CONTEXT_WINDOW = 200_000

export function useMessengerAgentStream(agentId: Ref<string>) {
  const config = useRuntimeConfig()
  const auth = useMessengerAuth()

  const substate = ref<AgentSubstate>('idle')
  const tokenCount = ref({ input: 0, output: 0, total: 0, contextPct: 0, cacheRead: 0, cacheWrite: 0 })
  const costUsd = ref(0)
  const streamingDraft = ref('')
  const toolUses = ref<AgentToolUseEntry[]>([])
  const runStartedAt = ref<number>(0)
  const errors = ref<string[]>([])

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let boundAgentId = ''

  function teardown() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws) {
      ws.close()
      ws = null
    }
  }

  function handleEvent(event: AgentStreamEvent) {
    if (event.type === 'run_start') {
      substate.value = 'idle'
      tokenCount.value = { input: 0, output: 0, total: 0, contextPct: 0, cacheRead: 0, cacheWrite: 0 }
      costUsd.value = 0
      streamingDraft.value = ''
      toolUses.value = []
      errors.value = []
      runStartedAt.value = Date.now()
      return
    }

    if (event.type === 'substate' && event.substate) {
      substate.value = event.substate
      return
    }

    if (event.type === 'delta' && event.delta) {
      streamingDraft.value += event.delta
      if (substate.value !== 'streaming') {
        substate.value = 'streaming'
      }
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
      const prev = toolUses.value.length > 0 ? toolUses.value[toolUses.value.length - 1] : null
      const updated = prev && !prev.endAt ? [...toolUses.value.slice(0, -1), { ...prev, endAt: now }] : [...toolUses.value]
      toolUses.value = [...updated, { tool: event.tool, descriptor, at: now }]
      substate.value = 'tool_call'
      return
    }

    if (event.type === 'tokens') {
      const input = event.tokenIn ?? tokenCount.value.input
      const output = event.tokenOut ?? tokenCount.value.output
      const total = input + output
      tokenCount.value = {
        input,
        output,
        total,
        contextPct: Math.min(100, Math.round((total / CONTEXT_WINDOW) * 100)),
        cacheRead: event.cacheRead ?? tokenCount.value.cacheRead,
        cacheWrite: event.cacheWrite ?? tokenCount.value.cacheWrite,
      }
      if (event.costUsd !== undefined) {
        costUsd.value = event.costUsd
      }
      return
    }

    if (event.type === 'complete') {
      substate.value = 'idle'
      streamingDraft.value = ''
      // Stamp endAt on last tool use if still open
      if (toolUses.value.length > 0) {
        const last = toolUses.value[toolUses.value.length - 1]
        if (!last.endAt) {
          toolUses.value = [...toolUses.value.slice(0, -1), { ...last, endAt: Date.now() }]
        }
      }
      return
    }

    if (event.type === 'error') {
      if (toolUses.value.length > 0) {
        const last = toolUses.value[toolUses.value.length - 1]
        if (!last.endAt) {
          toolUses.value = [...toolUses.value.slice(0, -1), { ...last, endAt: Date.now() }]
        }
      }
      substate.value = 'error'
      errors.value = [...errors.value, event.message || 'Unknown stream error']
      streamingDraft.value = ''
    }
  }

  function scheduleReconnect() {
    if (!import.meta.client || reconnectTimer || !auth.token.value || boundAgentId !== agentId.value) {
      return
    }
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, 1500)
  }

  function connect() {
    if (!import.meta.client || !auth.token.value || !agentId.value) {
      return
    }

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
      if (ws === socket) {
        ws = null
        scheduleReconnect()
      }
    })

    socket.addEventListener('error', () => {
      if (ws === socket) {
        ws = null
        scheduleReconnect()
      }
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
      substate.value = 'idle'
      streamingDraft.value = ''
      toolUses.value = []
      errors.value = []
    }
  }, { immediate: true })

  onUnmounted(() => {
    teardown()
  })

  return { substate, tokenCount, costUsd, streamingDraft, toolUses, runStartedAt, errors, cancel }
}
