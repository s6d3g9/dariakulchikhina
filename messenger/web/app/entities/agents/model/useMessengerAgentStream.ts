import type { Ref } from 'vue'
import { buildMessengerWsUrl } from '../../../utils/messenger-url'
import type { AgentSubstate } from '~/shared/types/agent-chat/agent-chat'

export type { AgentSubstate } from '~/shared/types/agent-chat/agent-chat'

interface AgentStreamEvent {
  type: 'run_start' | 'substate' | 'delta' | 'tool_use' | 'tokens' | 'complete' | 'error'
  runId?: string
  substate?: AgentSubstate
  text?: string
  inputTokens?: number
  outputTokens?: number
  costUsd?: number
  message?: string
}

const CONTEXT_WINDOW = 200_000

export function useMessengerAgentStream(agentId: Ref<string>) {
  const config = useRuntimeConfig()
  const auth = useMessengerAuth()

  const substate = ref<AgentSubstate>('idle')
  const tokenCount = ref({ input: 0, output: 0, total: 0, contextPct: 0 })
  const costUsd = ref(0)
  const streamingDraft = ref('')
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
      tokenCount.value = { input: 0, output: 0, total: 0, contextPct: 0 }
      costUsd.value = 0
      streamingDraft.value = ''
      errors.value = []
      return
    }

    if (event.type === 'substate' && event.substate) {
      substate.value = event.substate
      return
    }

    if (event.type === 'delta' && event.text) {
      streamingDraft.value += event.text
      if (substate.value !== 'streaming') {
        substate.value = 'streaming'
      }
      return
    }

    if (event.type === 'tokens') {
      const input = event.inputTokens ?? tokenCount.value.input
      const output = event.outputTokens ?? tokenCount.value.output
      const total = input + output
      tokenCount.value = {
        input,
        output,
        total,
        contextPct: Math.min(100, Math.round((total / CONTEXT_WINDOW) * 100)),
      }
      if (event.costUsd !== undefined) {
        costUsd.value = event.costUsd
      }
      return
    }

    if (event.type === 'complete') {
      substate.value = 'idle'
      streamingDraft.value = ''
      return
    }

    if (event.type === 'error') {
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
      errors.value = []
    }
  }, { immediate: true })

  onUnmounted(() => {
    teardown()
  })

  return { substate, tokenCount, costUsd, streamingDraft, errors, cancel }
}
