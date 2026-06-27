import type {
  ApiV1StudioShell,
  ApiV1StudioShellMetric,
  ApiV1StudioShellRecentItem,
  ApiV1StudioShellZone,
  ApiV1StudioShellZoneKey,
  ApiV1StudioShellZoneState,
} from '~/shared/types/api-v1'

type CountRow = {
  projects: number
  clients: number
  designers: number
  designerProjects: number
  contractors: number
  documents: number
  managers: number
  sellers: number
  extraServices: number
}

type WorkItemCounts = {
  total: number
  done: number
  overdue: number
}

type ProjectStatusCount = {
  status: string
  count: number
}

type RecentProjectRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  updatedAt: Date | string | null
}

type RecentClientRow = {
  id: number
  name: string
  createdAt: Date | string | null
}

type RecentDocumentRow = {
  id: number
  title: string
  category: string
  projectSlug: string | null
  projectTitle: string | null
  createdAt: Date | string | null
}

export type ApiV1StudioShellInput = {
  counts: CountRow
  workItems: WorkItemCounts
  projectStatusCounts: ProjectStatusCount[]
  recentProjects: RecentProjectRow[]
  recentClients: RecentClientRow[]
  recentDocuments: RecentDocumentRow[]
}

function asInt(value: unknown): number {
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function toIso(value: Date | string | null | undefined): string {
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'string') return value
  return ''
}

function metric(
  key: string,
  label: string,
  value: unknown,
  tone: ApiV1StudioShellMetric['tone'] = 'neutral',
): ApiV1StudioShellMetric {
  return {
    key,
    label,
    value: asInt(value),
    tone,
  }
}

function recentProject(row: RecentProjectRow): ApiV1StudioShellRecentItem {
  return {
    id: `project:${row.id}`,
    title: row.title || row.slug || 'Проект',
    subtitle: row.status || row.projectType || 'project',
    href: `/admin/projects/${row.slug}`,
    updatedAt: toIso(row.updatedAt),
  }
}

function recentClient(row: RecentClientRow): ApiV1StudioShellRecentItem {
  return {
    id: `client:${row.id}`,
    title: row.name || 'Клиент',
    subtitle: 'client',
    href: '/admin/clients',
    updatedAt: toIso(row.createdAt),
  }
}

function recentDocument(row: RecentDocumentRow): ApiV1StudioShellRecentItem {
  return {
    id: `document:${row.id}`,
    title: row.title || 'Документ',
    subtitle: row.projectTitle || row.category || 'document',
    href: row.projectSlug ? `/admin/projects/${row.projectSlug}` : '/admin/documents',
    updatedAt: toIso(row.createdAt),
  }
}

function zone(
  key: ApiV1StudioShellZoneKey,
  title: string,
  summary: string,
  state: ApiV1StudioShellZoneState,
  stateLabel: string,
  metrics: ApiV1StudioShellMetric[],
  recent: ApiV1StudioShellRecentItem[] = [],
): ApiV1StudioShellZone {
  return { key, title, summary, state, stateLabel, metrics, recent }
}

function createStatusMap(rows: ProjectStatusCount[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, row) => {
    if (row.status) acc[row.status] = asInt(row.count)
    return acc
  }, {})
}

function getProjectBucket(statuses: Record<string, number>, keys: string[]): number {
  return keys.reduce((sum, key) => sum + asInt(statuses[key]), 0)
}

export function createApiV1StudioShellDto(input: ApiV1StudioShellInput): ApiV1StudioShell {
  const counts = input.counts
  const workItems = input.workItems
  const statuses = createStatusMap(input.projectStatusCounts)
  const recentProjects = input.recentProjects.map(recentProject)
  const recentClients = input.recentClients.map(recentClient)
  const recentDocuments = input.recentDocuments.map(recentDocument)

  const projectSummary = {
    total: asInt(counts.projects),
    active: getProjectBucket(statuses, ['active', 'in_progress', 'design', 'construction']),
    leads: getProjectBucket(statuses, ['lead', 'new']),
    design: getProjectBucket(statuses, ['design', 'concept', 'documentation']),
    construction: getProjectBucket(statuses, ['construction', 'site', 'build']),
    completed: getProjectBucket(statuses, ['done', 'completed', 'archived']),
    taskTotal: asInt(workItems.total),
    taskDone: asInt(workItems.done),
    taskOverdue: asInt(workItems.overdue),
  }

  return {
    actor: {
      role: 'admin',
      scope: 'studio',
    },
    projectSummary,
    recentProjects,
    zones: {
      crm: zone(
        'crm',
        'CRM',
        'Клиенты, документы и lifecycle проекта.',
        'draft',
        'v1 shell',
        [
          metric('clients', 'Клиенты', counts.clients),
          metric('projects', 'Проекты', counts.projects),
          metric('documents', 'Документы', counts.documents),
          metric('managers', 'Менеджеры', counts.managers),
        ],
        recentClients,
      ),
      studio: zone(
        'studio',
        'Studio OS',
        'Операционный контур дизайн-студии.',
        'ready',
        'v1 shell',
        [
          metric('designers', 'Дизайнеры', counts.designers),
          metric('projects', 'Проекты', counts.projects),
          metric('sellers', 'Поставщики', counts.sellers),
          metric('services', 'Доп. услуги', counts.extraServices),
        ],
        recentProjects,
      ),
      design: zone(
        'design',
        'Design OS',
        'Дизайн-проект, согласования и документация.',
        'draft',
        'v1 designer cabinet',
        [
          metric('designProjects', 'Дизайн', counts.designerProjects),
          metric('documents', 'Документы', counts.documents),
          metric('approvals', 'Согласования', 0),
          metric('authors', 'Авторы', counts.designers),
        ],
        recentDocuments,
      ),
      construction: zone(
        'construction',
        'Construction OS',
        'Подрядчики, бригады, рабочие и задачи исполнения.',
        'draft',
        'v1 task projection',
        [
          metric('contractors', 'Подрядчики', counts.contractors),
          metric('tasks', 'Задачи', workItems.total),
          metric('doneTasks', 'Закрыто', workItems.done, 'good'),
          metric('overdueTasks', 'Просрочено', workItems.overdue, workItems.overdue ? 'warning' : 'neutral'),
        ],
      ),
      messenger: zone(
        'messenger',
        'Messenger',
        'Коммуникации и будущие action-события.',
        'next',
        'event bridge next',
        [
          metric('projectRooms', 'Проектные комнаты', counts.projects),
          metric('clientDialogs', 'Клиенты', counts.clients),
          metric('actionSources', 'Action sources', 0),
          metric('agents', 'Агенты', 0),
        ],
      ),
    },
  }
}
