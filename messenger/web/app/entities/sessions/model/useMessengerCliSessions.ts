export interface MessengerCliSession {
  slug: string
  uuid: string
  window: string
  workroom: string
  model: string
  created: string
  kind: string
  status: 'running' | 'done'
  archivedAt: string | null
  agentId: string | null
  agentDisplayName: string | null
  agentProjectId: string | null
  lastActivityAt: string | null
  idleForMs: number | null
  isIdle: boolean
  isActive: boolean
  lastSubstate: string | null
  lastTool: string | null
  lastToolDescriptor: string | null
  lastMessagePreview: string | null
  runStatus: string | null
  tokenInTotal: number
  tokenOutTotal: number
  costUsd: number
  parentRunId: string | null
  parentAgentId: string | null
  rootRunId: string | null
  childRunCount: number | null
  finishedAt: string | null
  runResult: string | null
  runError: string | null
  taskCompletionCount: number | null
  taskCompletionToday: number | null
}

export interface MessengerSessionDelta {
  slug: string
  reason: 'created' | 'event' | 'stopped' | 'archived' | 'patched'
  ts: string
  agentId?: string | null
  runId?: string | null
  substate?: string | null
  tool?: string | null
  tokenIn?: number
  tokenOut?: number
  message?: string | null
}

export const SESSION_KIND_META: Record<string, { label: string; icon: string; color: string; tier: number }> = {
  composer:           { label: 'Composer',     icon: 'mdi-brain',              color: 'primary',   tier: 0 },
  orchestrator:       { label: 'Orchestrator', icon: 'mdi-sitemap-outline',    color: 'secondary', tier: 1 },
  worker:             { label: 'Worker',        icon: 'mdi-cog-outline',        color: 'info',      tier: 2 },
  'frontend-ui':      { label: 'Frontend UI',  icon: 'mdi-monitor-shimmer',    color: 'info',      tier: 2 },
  'frontend-research':{ label: 'Research',     icon: 'mdi-magnify',            color: 'info',      tier: 2 },
  'backend-api':      { label: 'Backend API',  icon: 'mdi-api',                color: 'info',      tier: 2 },
  'backend-module':   { label: 'Backend Mod',  icon: 'mdi-cube-outline',       color: 'info',      tier: 2 },
  'db-migration':     { label: 'DB Migration', icon: 'mdi-database-arrow-right-outline', color: 'warning', tier: 2 },
  'messenger-realtime':{ label: 'Realtime',    icon: 'mdi-lightning-bolt',     color: 'info',      tier: 2 },
  tests:              { label: 'Tests',         icon: 'mdi-test-tube-outline',  color: 'success',   tier: 2 },
  docs:               { label: 'Docs',          icon: 'mdi-file-document-outline', color: 'surface-variant', tier: 2 },
  incident:           { label: 'Incident',      icon: 'mdi-alert-circle-outline', color: 'error',   tier: 2 },
}

export function getSessionKindMeta(kind: string, slug?: string) {
  const hit = SESSION_KIND_META[kind]
  if (hit) return hit
  // Slug-based fallback so a composer session with a missing/wrong kind is
  // never mistaken for a worker. A composer is the root agent by definition.
  if (slug?.startsWith('composer-')) return SESSION_KIND_META.composer!
  if (slug?.startsWith('orchestrator') || slug?.includes('-orch')) return SESSION_KIND_META.orchestrator!
  return { label: kind || 'Session', icon: 'mdi-robot-outline', color: 'surface-variant', tier: 2 }
}

export function useMessengerCliSessions() {
  const api = useAgentsApi()
  const sessions = useState<MessengerCliSession[]>('messenger-cli-sessions', () => [])
  const pending = useState<boolean>('messenger-cli-sessions-pending', () => false)
  const lastFetchedAt = useState<number>('messenger-cli-sessions-fetched', () => 0)
  const streamConnected = useState<boolean>('messenger-cli-sessions-stream', () => false)
  const lastDeltaAt = useState<number>('messenger-cli-sessions-last-delta', () => 0)

  const runningSessions = computed(() => sessions.value.filter(s => s.status === 'running' && !s.archivedAt))
  const activeSessions = computed(() => sessions.value.filter(s => s.status === 'running' && s.isActive && !s.archivedAt))
  const doneSessions = computed(() => sessions.value.filter(s => s.status === 'done' && !s.archivedAt))
  const archivedSessions = computed(() => sessions.value.filter(s => Boolean(s.archivedAt)))

  // Hierarchy (tier 0 = composers, tier 1 = orchestrators, tier 2 = workers).
  // Shows only live-running sessions; stopped ones drop out instantly thanks
  // to the SSE delta + tmux reconciler on the backend.
  const hierarchy = computed(() => {
    const byTier: MessengerCliSession[][] = [[], [], []]
    for (const s of runningSessions.value) {
      const meta = getSessionKindMeta(s.kind, s.slug)
      const tier = Math.min(meta.tier, 2)
      byTier[tier]!.push(s)
    }
    return byTier
  })

  function sessionForAgent(agentId: string): MessengerCliSession | null {
    return sessions.value.find(s => s.agentId === agentId) ?? null
  }

  async function setModel(slug: string, model: string) {
    await api.patchCliSession(slug, { model })
    await refresh()
  }

  async function archive(slug: string) {
    await api.patchCliSession(slug, { archived: true })
    await refresh()
  }

  async function stopSession(slug: string) {
    await api.stopCliSession(slug)
    // Server emits a 'stopped' delta that triggers refresh() via SSE. Still,
    // kick an explicit refresh so the UI doesn't lag if SSE is blocked.
    await refresh()
  }

  async function refresh(includeArchived = true) {
    pending.value = true
    try {
      const res = await api.listCliSessions(includeArchived)
      sessions.value = res.sessions
      lastFetchedAt.value = Date.now()
    }
    catch (err) {
      console.warn('[cli-sessions] refresh failed', err)
    }
    finally {
      pending.value = false
    }
  }

  // --- SSE stream for live deltas ---

  let eventSource: EventSource | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempt = 0

  function connectStream() {
    if (typeof window === 'undefined') return
    if (eventSource) return
    const auth = useMessengerAuth()
    const token = auth.token.value
    if (!token) return
    const config = useRuntimeConfig()
    const base = String(config.public.messengerCoreBaseUrl || '').replace(/\/+$/, '')
    const url = `${base}/cli-sessions/stream?token=${encodeURIComponent(token)}`
    try {
      eventSource = new EventSource(url)
    } catch (err) {
      console.warn('[cli-sessions] failed to open SSE', err)
      return
    }
    eventSource.onopen = () => {
      streamConnected.value = true
      reconnectAttempt = 0
    }
    eventSource.onmessage = (msg) => {
      lastDeltaAt.value = Date.now()
      try {
        const delta = JSON.parse(msg.data) as MessengerSessionDelta
        applyDelta(delta)
      } catch (err) {
        console.warn('[cli-sessions] malformed delta', err)
      }
    }
    eventSource.onerror = () => {
      streamConnected.value = false
      eventSource?.close()
      eventSource = null
      scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer) return
    const delay = Math.min(30_000, 1000 * Math.pow(2, reconnectAttempt))
    reconnectAttempt += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connectStream()
    }, delay)
  }

  function applyDelta(delta: MessengerSessionDelta) {
    // 'created' / 'archived' / 'stopped' / 'patched' alter the set — full refresh.
    // 'event' is per-activity and can be merged in place.
    if (delta.reason === 'event') {
      const idx = sessions.value.findIndex(s => s.slug === delta.slug)
      if (idx === -1) {
        refresh().catch(() => {})
        return
      }
      const prev = sessions.value[idx]!
      const merged: MessengerCliSession = {
        ...prev,
        lastActivityAt: delta.ts,
        idleForMs: 0,
        isIdle: false,
        lastSubstate: delta.substate ?? prev.lastSubstate,
        lastTool: delta.tool ?? prev.lastTool,
        lastMessagePreview: delta.message ?? prev.lastMessagePreview,
        tokenInTotal: typeof delta.tokenIn === 'number' ? prev.tokenInTotal + delta.tokenIn : prev.tokenInTotal,
        tokenOutTotal: typeof delta.tokenOut === 'number' ? prev.tokenOutTotal + delta.tokenOut : prev.tokenOutTotal,
      }
      sessions.value = [
        ...sessions.value.slice(0, idx),
        merged,
        ...sessions.value.slice(idx + 1),
      ]
    } else {
      refresh().catch(() => {})
    }
  }

  function disconnectStream() {
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (eventSource) { eventSource.close(); eventSource = null }
    streamConnected.value = false
  }

  return {
    sessions,
    runningSessions,
    activeSessions,
    doneSessions,
    archivedSessions,
    hierarchy,
    pending,
    lastFetchedAt,
    streamConnected,
    lastDeltaAt,
    sessionForAgent,
    setModel,
    archive,
    stopSession,
    refresh,
    connectStream,
    disconnectStream,
  }
}
