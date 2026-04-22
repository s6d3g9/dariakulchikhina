import { buildMessengerWsUrl } from '../../../utils/messenger-url'

// ── Streaming pulse tracker (module-level singleton, client-only) ─────────────
const _lastStreamAt = new Map<string, number>()
// Incremented every 500 ms so that `isAgentPulsing` re-evaluates reactively.
const _streamTick = ref(0)
const _agentWs = new Map<string, WebSocket>()
let _tickStarted = false
// Prevent setting up the session-list watcher more than once across composable calls.
let _watchSetup = false

function _ensureTick() {
  if (_tickStarted || !import.meta.client) return
  _tickStarted = true
  setInterval(() => { _streamTick.value++ }, 500)
}

function _subscribeAgent(agentId: string, wsBaseUrl: string, token: string) {
  if (_agentWs.has(agentId) || !import.meta.client) return
  const wsUrl = buildMessengerWsUrl(wsBaseUrl, `/ws/agents/${agentId}/stream`)
  wsUrl.searchParams.set('token', token)
  const socket = new WebSocket(wsUrl.toString())
  _agentWs.set(agentId, socket)
  socket.addEventListener('message', () => { _lastStreamAt.set(agentId, Date.now()) })
  socket.addEventListener('close', () => { _agentWs.delete(agentId) })
  socket.addEventListener('error', () => { _agentWs.delete(agentId) })
}

function _unsubscribeAgent(agentId: string) {
  _agentWs.get(agentId)?.close()
  _agentWs.delete(agentId)
  _lastStreamAt.delete(agentId)
}
// ─────────────────────────────────────────────────────────────────────────────

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

export function getSessionKindMeta(kind: string) {
  return SESSION_KIND_META[kind] ?? { label: kind || 'Session', icon: 'mdi-robot-outline', color: 'surface-variant', tier: 2 }
}

export function useMessengerCliSessions() {
  const api = useAgentsApi()
  const sessions = useState<MessengerCliSession[]>('messenger-cli-sessions', () => [])
  const pending = useState<boolean>('messenger-cli-sessions-pending', () => false)
  const lastFetchedAt = useState<number>('messenger-cli-sessions-fetched', () => 0)

  const runningSessions = computed(() => sessions.value.filter(s => s.status === 'running'))
  const doneSessions = computed(() => sessions.value.filter(s => s.status === 'done'))

  // Hierarchy: tier 0 = composers, tier 1 = orchestrators, tier 2+ = workers
  const hierarchy = computed(() => {
    const byTier: MessengerCliSession[][] = [[], [], []]
    for (const s of sessions.value) {
      const meta = getSessionKindMeta(s.kind)
      const tier = Math.min(meta.tier, 2)
      byTier[tier]!.push(s)
    }
    return byTier
  })

  // Set up per-agent stream WS subscriptions once (client-only).
  if (import.meta.client && !_watchSetup) {
    _watchSetup = true
    _ensureTick()
    const config = useRuntimeConfig()
    const auth = useMessengerAuth()
    watch(runningSessions, (current: MessengerCliSession[], prev: MessengerCliSession[] | undefined) => {
      const prevIds = new Set((prev ?? []).map((s: MessengerCliSession) => s.agentId).filter(Boolean) as string[])
      const currIds = new Set(current.map((s: MessengerCliSession) => s.agentId).filter(Boolean) as string[])
      for (const id of currIds) {
        if (!prevIds.has(id) && auth.token.value) {
          _subscribeAgent(id, String(config.public.messengerCoreBaseUrl), auth.token.value)
        }
      }
      for (const id of prevIds) {
        if (!currIds.has(id)) _unsubscribeAgent(id)
      }
    }, { immediate: true })
  }

  function isAgentPulsing(agentId: string): boolean {
    // Reading _streamTick makes Vue re-evaluate this on every 500 ms tick.
    void _streamTick.value
    return Date.now() - (_lastStreamAt.get(agentId) ?? 0) < 3_000
  }

  function sessionForAgent(agentId: string): MessengerCliSession | null {
    return sessions.value.find(s => s.agentId === agentId) ?? null
  }

  async function refresh(includeArchived = false) {
    pending.value = true
    try {
      const res = await api.listCliSessions(includeArchived)
      sessions.value = res.sessions
      lastFetchedAt.value = Date.now()
    }
    catch {}
    finally {
      pending.value = false
    }
  }

  return { sessions, runningSessions, doneSessions, hierarchy, pending, lastFetchedAt, sessionForAgent, isAgentPulsing, refresh }
}
