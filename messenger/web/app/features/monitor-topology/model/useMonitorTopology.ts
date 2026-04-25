import type { Ref } from 'vue'
import type { MessengerCliSession } from '../../../entities/sessions/model/useMessengerCliSessions'
import { getSessionKindMeta } from '../../../entities/sessions/model/useMessengerCliSessions'

export type MonitorMode = 'live' | 'today'

export interface MonitorRow {
  session: MessengerCliSession
  depth: number
  parentAgentId: string | null
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

    function pushSubtree(node: MessengerCliSession, depth: number, parentAgentId: string | null) {
      if (seen.has(node.slug)) return
      seen.add(node.slug)
      rows.push({ session: node, depth, parentAgentId })
      if (!node.agentId) return
      const children = childrenMap.get(node.agentId)
      if (!children?.length) return
      for (const child of children) pushSubtree(child, depth + 1, node.agentId)
    }

    for (const root of roots.value) pushSubtree(root, 0, null)

    // Append any sessions we haven't visited (defensive — should be empty).
    for (const s of filtered.value) {
      if (!seen.has(s.slug)) rows.push({ session: s, depth: 0, parentAgentId: s.parentAgentId ?? null })
    }
    return rows
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
    }
  })

  return { filtered, roots, byParentAgentId, flatSorted, counters }
}
