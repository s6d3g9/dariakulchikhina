// ── Notifications types ────────────────────────────────────────────────

export interface NotificationBadgeCount {
  count: number
  label: string
}

export interface AdminNotificationsSummary {
  total: number
  extra: NotificationBadgeCount
  overdue: NotificationBadgeCount
  control: NotificationBadgeCount
}

// ── Search types ───────────────────────────────────────────────────────

export interface SearchProject {
  id: number
  slug: string
  title: string
  status: string
  type: 'project'
  href: string
}

export interface SearchClient {
  id: number
  name: string
  phone: string | null
  email: string | null
  type: 'client'
  href: string
}

export interface SearchContractor {
  id: number
  slug: string
  name: string
  companyName: string | null
  phone: string | null
  type: 'contractor'
  href: string
}

export interface SearchResults {
  projects: SearchProject[]
  clients: SearchClient[]
  contractors: SearchContractor[]
  total: number
}

// ── Repository row types ───────────────────────────────────────────────

export interface ProjectControlRow {
  slug: string
  status: string
  pages: string[]
  profile: Record<string, unknown>
}

export interface SearchProjectRow {
  id: number
  slug: string
  title: string
  status: string
}

export interface SearchClientRow {
  id: number
  name: string
  phone: string | null
  email: string | null
}

export interface SearchContractorRow {
  id: number
  slug: string
  name: string
  companyName: string | null
  phone: string | null
}
