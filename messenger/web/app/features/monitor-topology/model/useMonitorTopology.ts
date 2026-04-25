import type { InjectionKey, Ref } from 'vue'
import type { MessengerCliSession } from '../../../entities/sessions/model/useMessengerCliSessions'
import { getSessionKindMeta } from '../../../entities/sessions/model/useMessengerCliSessions'
import { deriveLiveness, type LivenessMeta } from './liveness'

export type MonitorMode = 'live' | 'today'
export type MonitorFilter = 'all' | 'awaiting' | 'crashed'

export interface MonitorRow {
  session: MessengerCliSession
  depth: number
  parentAgentId: string | null
  hasChildren: boolean
  childCount: number
  isLastSibling: boolean
  liveness: LivenessMeta
}

function startOfTodayMs(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function tierOf(s: MessengerCliSession): number {
  return Math.min(getSessionKindMeta(s.kind, s.slug).tier, 2)
}

function lastActivityMs(s: MessengerCliSession): number {
  if (!s.lastActivityAt) return 0
  const t = Date.parse(s.lastActivityAt)
  return Number.isFinite(t) ? t : 0
}

export function useMonitorTopology(
  sessions: Ref<MessengerCliSession[]>,
  mode: Ref<MonitorMode>,
  activeSlug?: Ref<string | null>,
) {
  const filtered = computed<MessengerCliSession[]>(() => {
    const todayStart = startOfTodayMs()
    return sessions.value.filter((s) => {
      if (s.archivedAt) return false
      if (mode.value === 'live') return s.status === 'running'
      if (s.status === 'running') return true
      const ts = lastActivityMs(s) || (s.finishedAt ? Date.parse(s.finishedAt) : 0)
      return ts >= todayStart
    })
  })

  const byParentAgentId = computed<Map<string, MessengerCliSession[]>>(() => {
    const map = new Map<string, MessengerCliSession[]>()
    for (const s of filtered.value) {
      const key = s.parentAgentId ?? '__root__'
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    // Sort siblings: tier asc, then most-recent activity desc, then slug asc.
    for (const list of map.values()) {
      list.sort((a, b) => {
        const ta = tierOf(a)
        const tb = tierOf(b)
        if (ta !== tb) return ta - tb
        const la = lastActivityMs(a)
        const lb = lastActivityMs(b)
        if (la !== lb) return lb - la
        return a.slug.localeCompare(b.slug)
      })
    }
    return map
  })

  const roots = computed<MessengerCliSession[]>(() => {
    const knownAgentIds = new Set<string>()
    for (const s of filtered.value) {
      if (s.agentId) knownAgentIds.add(s.agentId)
    }
    // A row is a root when it has no parent OR its parent is not in the
    // visible set (orphan re-rooted to keep the tree connected).
    return filtered.value
      .filter(s => !s.parentAgentId || !knownAgentIds.has(s.parentAgentId))
      .sort((a, b) => {
        const ta = tierOf(a)
        const tb = tierOf(b)
        if (ta !== tb) return ta - tb
        const la = lastActivityMs(a)
        const lb = lastActivityMs(b)
        if (la !== lb) return lb - la
        return a.slug.localeCompare(b.slug)
      })
  })

  const flatSorted = computed<MonitorRow[]>(() => {
    const rows: MonitorRow[] = []
    const seen = new Set<string>()
    const childrenMap = byParentAgentId.value

    function pushSubtree(node: MessengerCliSession, depth: number, parentAgentId: string | null, isLast: boolean) {
      if (seen.has(node.slug)) return
      seen.add(node.slug)
      const children = node.agentId ? (childrenMap.get(node.agentId) ?? []) : []
      rows.push({
        session: node,
        depth,
        parentAgentId,
        hasChildren: children.length > 0,
        childCount: children.length,
        isLastSibling: isLast,
        liveness: deriveLiveness(node),
      })
      for (let i = 0; i < children.length; i++) {
        pushSubtree(children[i]!, depth + 1, node.agentId, i === children.length - 1)
      }
    }

    const roots_ = roots.value
    for (let i = 0; i < roots_.length; i++) {
      pushSubtree(roots_[i]!, 0, null, i === roots_.length - 1)
    }

    // Append any sessions we haven't visited (defensive — should be empty).
    for (const s of filtered.value) {
      if (!seen.has(s.slug)) {
        rows.push({
          session: s,
          depth: 0,
          parentAgentId: s.parentAgentId ?? null,
          hasChildren: false,
          childCount: 0,
          isLastSibling: true,
          liveness: deriveLiveness(s),
        })
      }
    }
    return rows
  })

  const byRootRunId = computed<Map<string, MessengerCliSession[]>>(() => {
    const map = new Map<string, MessengerCliSession[]>()
    for (const s of filtered.value) {
      const key = s.rootRunId
      if (!key) continue
      const list = map.get(key) ?? []
      list.push(s)
      map.set(key, list)
    }
    return map
  })

  const bySlug = computed<Map<string, MessengerCliSession>>(() => {
    const map = new Map<string, MessengerCliSession>()
    for (const s of filtered.value) map.set(s.slug, s)
    return map
  })

  const byAgentId = computed<Map<string, MessengerCliSession>>(() => {
    const map = new Map<string, MessengerCliSession>()
    for (const s of filtered.value) {
      if (s.agentId) map.set(s.agentId, s)
    }
    return map
  })

  // Set of slugs that share a trace (rootRunId) with the active session.
  const activeTrace = computed<Set<string>>(() => {
    if (!activeSlug?.value) return new Set()
    const cur = bySlug.value.get(activeSlug.value)
    if (!cur?.rootRunId) return new Set([activeSlug.value])
    const members = byRootRunId.value.get(cur.rootRunId) ?? []
    return new Set(members.map(s => s.slug))
  })

  // Walk parent chain via parentAgentId (CLI session lineage).
  function ancestryFor(slug: string): MessengerCliSession[] {
    const chain: MessengerCliSession[] = []
    let cur = bySlug.value.get(slug) ?? null
    const seen = new Set<string>()
    while (cur && !seen.has(cur.slug)) {
      seen.add(cur.slug)
      const parentId = cur.parentAgentId
      if (!parentId) break
      const parent = byAgentId.value.get(parentId)
      if (!parent) break
      chain.push(parent)
      cur = parent
    }
    return chain.reverse()
  }

  function childrenFor(slug: string): MessengerCliSession[] {
    const cur = bySlug.value.get(slug)
    if (!cur?.agentId) return []
    return byParentAgentId.value.get(cur.agentId) ?? []
  }

  // Reuse the liveness already computed by flatSorted's pushSubtree pass —
  // deriving it again from filtered.value would double the deriveLiveness cost
  // on every SSE delta.
  const livenessIndex = computed<Map<string, LivenessMeta>>(() => {
    const map = new Map<string, LivenessMeta>()
    for (const row of flatSorted.value) map.set(row.session.slug, row.liveness)
    return map
  })

  const awaitingSlugs = computed<Set<string>>(() => {
    const set = new Set<string>()
    for (const [slug, l] of livenessIndex.value) {
      if (l.state === 'awaiting-user') set.add(slug)
    }
    return set
  })

  const crashedSlugs = computed<Set<string>>(() => {
    const set = new Set<string>()
    for (const [slug, l] of livenessIndex.value) {
      if (l.state === 'crashed') set.add(slug)
    }
    return set
  })

  const counters = computed(() => {
    let composers = 0
    let orchestrators = 0
    let workers = 0
    let active = 0
    for (const s of filtered.value) {
      const t = tierOf(s)
      if (t === 0) composers++
      else if (t === 1) orchestrators++
      else workers++
      if (s.isActive) active++
    }
    return {
      total: filtered.value.length,
      composers,
      orchestrators,
      workers,
      active,
      awaiting: awaitingSlugs.value.size,
      crashed: crashedSlugs.value.size,
    }
  })

  return {
    filtered,
    roots,
    byParentAgentId,
    flatSorted,
    counters,
    byRootRunId,
    bySlug,
    byAgentId,
    activeTrace,
    awaitingSlugs,
    crashedSlugs,
    livenessIndex,
    ancestryFor,
    childrenFor,
  }
}

export type MonitorTopology = ReturnType<typeof useMonitorTopology>

// Provide/inject lets the section instantiate useMonitorTopology once and
// share the result with descendant components (the tree, future slot consumers)
// instead of each component re-instantiating it. Halves the recompute cost on
// every SSE delta when both the section and the tree need the same indexes.
const MONITOR_TOPOLOGY_KEY: InjectionKey<MonitorTopology> = Symbol('monitor-topology')

export function provideMonitorTopology(
  sessions: Ref<MessengerCliSession[]>,
  mode: Ref<MonitorMode>,
  activeSlug?: Ref<string | null>,
): MonitorTopology {
  const topology = useMonitorTopology(sessions, mode, activeSlug)
  provide(MONITOR_TOPOLOGY_KEY, topology)
  return topology
}

export function injectMonitorTopology(): MonitorTopology {
  const t = inject(MONITOR_TOPOLOGY_KEY)
  if (!t) throw new Error('injectMonitorTopology() must be called inside a provideMonitorTopology() scope')
  return t
}
