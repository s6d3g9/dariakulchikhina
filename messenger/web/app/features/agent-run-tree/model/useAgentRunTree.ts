import type { Ref } from 'vue'
import type { MessengerAgentRun } from '../../../entities/agents/model/useMessengerAgentRuns'
import { buildMessengerWsUrl } from '../../../utils/messenger-url'

export type RunNode = MessengerAgentRun

export interface AgentRunTreeState {
  nodes: Record<string, RunNode>
  rootIds: string[]
  childrenByParent: Record<string, string[]>
}

interface AgentTreeWsEvent {
  type: 'run_upsert'
  run: RunNode
}

export function useAgentRunTree(rootRunId: Ref<string>, agentId: Ref<string>) {
  const auth = useMessengerAuth()
  const config = useRuntimeConfig()

  const nodes = ref<Record<string, RunNode>>({})
  const isLoading = ref(false)

  const rootIds = computed(() =>
    Object.values(nodes.value)
      .filter(n => !n.parentRunId)
      .map(n => n.runId),
  )

  const childrenByParent = computed(() => {
    const map: Record<string, string[]> = {}
    for (const node of Object.values(nodes.value)) {
      if (node.parentRunId) {
        if (!map[node.parentRunId]) map[node.parentRunId] = []
        map[node.parentRunId].push(node.runId)
      }
    }
    return map
  })

  const tree = computed<AgentRunTreeState>(() => ({
    nodes: nodes.value,
    rootIds: rootIds.value,
    childrenByParent: childrenByParent.value,
  }))

  function upsertNode(run: RunNode) {
    nodes.value = { ...nodes.value, [run.runId]: run }
  }

  async function refresh() {
    if (!rootRunId.value || !agentId.value) return
    isLoading.value = true
    const all: RunNode[] = []
    let cursor: string | undefined

    try {
      do {
        const response = await auth.request<{ runs: RunNode[]; nextCursor?: string }>(
          `/agents/${agentId.value}/runs`,
          { method: 'GET', query: { rootRunId: rootRunId.value, cursor } },
        )
        all.push(...response.runs)
        cursor = response.nextCursor
      } while (cursor)

      const map: Record<string, RunNode> = {}
      for (const run of all) map[run.runId] = run
      nodes.value = map
    }
    finally {
      isLoading.value = false
    }
  }

  async function cancel(runId: string) {
    await auth.request(`/runs/${runId}/cancel`, { method: 'POST' })
  }

  let ws: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let boundRootRunId = ''

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

  function handleWsEvent(event: AgentTreeWsEvent) {
    if (event.type === 'run_upsert' && event.run) {
      upsertNode(event.run)
    }
  }

  function scheduleReconnect() {
    if (!import.meta.client || reconnectTimer || !auth.token.value || boundRootRunId !== rootRunId.value) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, 1500)
  }

  function connect() {
    if (!import.meta.client || !auth.token.value || !rootRunId.value) return
    teardown()
    boundRootRunId = rootRunId.value

    const wsUrl = buildMessengerWsUrl(
      config.public.messengerCoreBaseUrl,
      `/ws/agent-tree/${rootRunId.value}`,
    )
    wsUrl.searchParams.set('token', auth.token.value)

    const socket = new WebSocket(wsUrl.toString())
    ws = socket

    socket.addEventListener('message', (msg) => {
      try {
        const event = JSON.parse(String(msg.data)) as AgentTreeWsEvent
        handleWsEvent(event)
      }
      catch {
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

  watch(rootRunId, async (id) => {
    teardown()
    nodes.value = {}
    if (id) {
      await refresh()
      connect()
    }
  }, { immediate: true })

  onUnmounted(() => {
    teardown()
  })

  return { tree, isLoading, refresh, cancel }
}
