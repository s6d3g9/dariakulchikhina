export interface MessengerCliSession {
  slug: string
  uuid: string
  window: string
  workroom: string
  model: string
  created: string
  kind: string
  effort: string
  status: 'running' | 'done'
  archivedAt: string | null
  agentId: string | null
  agentDisplayName: string | null
  agentProjectId: string | null
  parentRunId: string | null
  parentAgentId: string | null
  rootRunId: string | null
  childRunCount: number
  finishedAt: string | null
  runResult: string | null
  runError: string | null
  taskCompletionCount: number
  taskCompletionToday: number
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
    catch (err) {
      console.warn('[cli-sessions] refresh failed', err)
    }
    finally {
      pending.value = false
    }
  }

  async function setModel(slug: string, model: string) {
    await api.patchCliSession(slug, { model })
  }

  async function setEffort(slug: string, effort: 'low' | 'medium' | 'high') {
    await api.patchCliSession(slug, { effort })
  }

  return { sessions, runningSessions, doneSessions, hierarchy, pending, lastFetchedAt, sessionForAgent, refresh, setModel, setEffort }
}
