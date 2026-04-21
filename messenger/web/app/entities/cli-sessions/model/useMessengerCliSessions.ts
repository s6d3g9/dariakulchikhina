/**
 * useMessengerCliSessions — list tmux Claude-CLI sessions that belong to the
 * currently logged-in messenger user, optionally narrowed to one project
 * (by `workroom === projectSlug`).
 *
 * Source of truth is `~/state/claude-sessions/.registry.tsv` on the server,
 * exposed through messenger-core's session-authenticated
 * `GET /cli-sessions/registry` — the same data the claude-web-dashboard
 * (port 9090) renders, so the lists stay synchronised across both UIs.
 */

export interface MessengerCliSession {
  slug: string
  uuid: string
  window: string
  workroom: string
  model: string
  created: string
  kind: string
  ownerUserId: string | null
  archived: boolean
  archivedAt: string | null
  logSize: number | null
  logMtimeMs: number | null
}

interface CliSessionsResponse {
  sessions: MessengerCliSession[]
  viewer: { id: string; login: string; displayName: string } | null
}

export function useMessengerCliSessions(projectSlug?: Ref<string | null>) {
  const auth = useMessengerAuth()
  const sessions = useState<MessengerCliSession[]>('messenger-cli-sessions', () => [])
  const pending = useState<boolean>('messenger-cli-sessions-pending', () => false)
  const error = useState<string | null>('messenger-cli-sessions-error', () => null)

  async function refresh() {
    pending.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      params.set('includeArchive', '1')
      const slug = projectSlug?.value?.trim()
      if (slug) params.set('projectSlug', slug)
      const path = '/cli-sessions/registry?' + params.toString()
      const response = await auth.request<CliSessionsResponse>(path, { method: 'GET' })
      sessions.value = Array.isArray(response.sessions) ? response.sessions : []
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      error.value = message
      sessions.value = []
    } finally {
      pending.value = false
    }
  }

  function fmtAge(mtimeMs: number | null) {
    if (!mtimeMs) return '—'
    const diffSec = Math.max(0, Math.round((Date.now() - mtimeMs) / 1000))
    if (diffSec < 60) return diffSec + 's ago'
    if (diffSec < 3600) return Math.round(diffSec / 60) + 'm ago'
    if (diffSec < 86400) return Math.round(diffSec / 3600) + 'h ago'
    return Math.round(diffSec / 86400) + 'd ago'
  }

  function fmtSize(bytes: number | null) {
    if (!bytes) return '0 B'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  return { sessions, pending, error, refresh, fmtAge, fmtSize }
}
