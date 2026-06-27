import type {
  ApiV1StudioApprovalStatus,
  ApiV1StudioDesigner,
  ApiV1StudioDesignerCabinet,
  ApiV1StudioDesignerContact,
  ApiV1StudioDesignerProject,
  ApiV1StudioDesignerProjectApproval,
  ApiV1StudioDesignerProjectClientRef,
  ApiV1StudioDesignerProjectContractorRef,
  ApiV1StudioDesignerProjectDocumentRef,
  ApiV1StudioDesignerProjectRoadmapItem,
  ApiV1StudioDesignerProjectStatus,
  ApiV1StudioEntityRef,
  ApiV1TaskProjectRef,
} from '~/shared/types/api-v1'
import {
  DESIGNER_PROJECT_STATUS_LABELS,
  type DesignerPackage,
  type DesignerServicePrice,
  type DesignerSubscription,
} from '~/shared/types/designer'
import {
  getAvailableDesignerPackageKeySet,
  getNormalizedDesignerServiceKeySet,
  normalizeDesignerPackages,
  normalizeDesignerServices,
  normalizeDesignerSubscriptions,
} from '~/shared/utils/designer/designer-catalogs'

export type ApiV1StudioDesignerRow = {
  id: number
  name: string
  companyName: string | null
  phone: string | null
  email: string | null
  telegram: string | null
  website: string | null
  city: string | null
  experience: string | null
  about: string | null
  specializations: string[]
  services: Record<string, unknown>[]
  packages: Record<string, unknown>[]
  subscriptions: Record<string, unknown>[]
  createdAt: Date | string | null
  updatedAt: Date | string | null
}

export type ApiV1StudioDesignerProjectRow = {
  id: number
  designerId: number
  projectId: number
  packageKey: string | null
  pricePerSqm: number | null
  area: number | null
  totalPrice: number | null
  status: string
  notes: string | null
  createdAt: Date | string | null
  project: {
    id: number
    slug: string
    title: string
    status: string
    projectType: string
    updatedAt: Date | string | null
  }
}

export type ApiV1StudioDesignerProjectClientRow = {
  designerProjectId: number
  clientId: number
  name: string
  phone: string | null
  email: string | null
}

export type ApiV1StudioDesignerProjectContractorRow = {
  designerProjectId: number
  contractorId: number
  name: string
  companyName: string | null
  role: string | null
}

export type ApiV1StudioDesignerProjectDocumentRow = {
  id: number
  projectId: number | null
  category: string
  title: string
  filename: string | null
  url: string | null
  createdAt: Date | string | null
}

export type ApiV1StudioDesignerProjectWorkItemCountRow = {
  projectId: number
  total: number
  done: number
  overdue: number
}

type NormalizedDesignerCatalogs = {
  services: DesignerServicePrice[]
  packages: DesignerPackage[]
  subscriptions: DesignerSubscription[]
}

const DESIGNER_PROJECT_STATUSES = new Set<ApiV1StudioDesignerProjectStatus>([
  'draft',
  'active',
  'paused',
  'completed',
  'archived',
])

const ROADMAP_FALLBACK = [
  { phaseKey: 'brief', title: 'Бриф и ТЗ' },
  { phaseKey: 'space_planning', title: 'Планировочное решение' },
  { phaseKey: 'concept', title: 'Концепция и мудборды' },
  { phaseKey: 'drawings', title: 'Рабочие чертежи' },
  { phaseKey: 'specification', title: 'Спецификации и материалы' },
  { phaseKey: 'supervision', title: 'Авторский надзор' },
]

const SERVICE_PHASE_HINTS: Record<string, { phaseKey: string; title: string }> = {
  site_visit: { phaseKey: 'brief', title: 'Выезд и обследование' },
  measurement: { phaseKey: 'brief', title: 'Обмерный план' },
  photo_fixation: { phaseKey: 'brief', title: 'Фотофиксация объекта' },
  moodboard: { phaseKey: 'concept', title: 'Мудборд' },
  concept_collage: { phaseKey: 'concept', title: 'Концепт-коллаж' },
  space_planning: { phaseKey: 'space_planning', title: 'Планировочное решение' },
  color_scheme: { phaseKey: 'concept', title: 'Цветовое решение' },
  '3d_visualization': { phaseKey: 'concept', title: '3D-визуализация' },
  wall_elevations: { phaseKey: 'drawings', title: 'Развёртки стен' },
  working_drawings: { phaseKey: 'drawings', title: 'Рабочие чертежи' },
  electrical_plan: { phaseKey: 'drawings', title: 'План электрики' },
  plumbing_plan: { phaseKey: 'drawings', title: 'План сантехники' },
  material_selection: { phaseKey: 'specification', title: 'Подбор материалов' },
  furniture_selection: { phaseKey: 'specification', title: 'Подбор мебели' },
  lighting_plan: { phaseKey: 'specification', title: 'Светодизайн' },
  specification: { phaseKey: 'specification', title: 'Сводная спецификация' },
  author_supervision: { phaseKey: 'supervision', title: 'Авторский надзор' },
}

function safeString(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function safeStringList(values: unknown, maxLength = 240): string[] {
  if (!Array.isArray(values)) return []
  return values
    .map(value => safeString(value, maxLength))
    .filter(Boolean)
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

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function createEntityRef(
  entityType: ApiV1StudioEntityRef['entityType'],
  id: string,
  displayName: string,
  href: string,
): ApiV1StudioEntityRef {
  return {
    id,
    entityType,
    addressableId: id,
    displayName,
    href,
  }
}

function createProjectRef(row: ApiV1StudioDesignerProjectRow['project']): ApiV1TaskProjectRef {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    projectType: row.projectType,
    updatedAt: toIso(row.updatedAt),
    addressableId: `project:${row.slug}`,
  }
}

function normalizeDesignerStatus(status: string | null | undefined): ApiV1StudioDesignerProjectStatus {
  const normalized = safeString(status, 80).toLowerCase().replace(/[\s-]+/g, '_') as ApiV1StudioDesignerProjectStatus
  return DESIGNER_PROJECT_STATUSES.has(normalized) ? normalized : 'draft'
}

function normalizeCatalogs(designer: ApiV1StudioDesignerRow): NormalizedDesignerCatalogs {
  const services = normalizeDesignerServices(designer.services)
  const validServiceKeys = getNormalizedDesignerServiceKeySet(services)
  const packages = normalizeDesignerPackages(designer.packages, { validServiceKeys })
  const subscriptions = normalizeDesignerSubscriptions(designer.subscriptions, { validServiceKeys })
  return { services, packages, subscriptions }
}

function getPackageForProject(
  project: ApiV1StudioDesignerProjectRow,
  catalogs: NormalizedDesignerCatalogs,
): DesignerPackage | null {
  const validServiceKeys = getNormalizedDesignerServiceKeySet(catalogs.services)
  const validPackageKeys = getAvailableDesignerPackageKeySet(catalogs.packages, { validServiceKeys })
  const packageKey = safeString(project.packageKey, 160)
  if (!packageKey || !validPackageKeys.has(packageKey)) return null
  return catalogs.packages.find(pkg => pkg.key === packageKey) || null
}

function getProfileCompleteness(row: ApiV1StudioDesignerRow): ApiV1StudioDesigner['profileCompleteness'] {
  const checks = [
    row.name,
    row.companyName,
    row.phone,
    row.email,
    row.telegram,
    row.website,
    row.city,
    row.experience,
    row.about,
    row.specializations?.length ? 'specializations' : '',
  ]
  const filled = checks.filter(Boolean).length
  return {
    filled,
    total: checks.length,
    percent: checks.length ? Math.round((filled / checks.length) * 100) : 0,
  }
}

function getStartingPrice(services: DesignerServicePrice[]): number | null {
  const prices = services
    .filter(service => service.enabled && Number.isFinite(Number(service.price)))
    .map(service => Number(service.price))
    .filter(price => price > 0)
  if (!prices.length) return null
  return Math.min(...prices)
}

function createDesignerDto(
  row: ApiV1StudioDesignerRow,
  catalogs: NormalizedDesignerCatalogs,
  projectDtos: ApiV1StudioDesignerProject[],
): ApiV1StudioDesigner {
  const id = `designer:${row.id}`
  const displayName = safeString(row.name, 240) || `Дизайнер #${row.id}`
  const designerProjects = projectDtos.filter(project => project.designer.id === id)
  const clientIds = unique(designerProjects.flatMap(project => project.clients.map(client => client.id)))

  return {
    id: row.id,
    addressableId: id,
    entityRef: createEntityRef('designer', id, displayName, `/admin/designers?id=${row.id}`),
    displayName,
    companyName: safeString(row.companyName, 240),
    contact: {
      phone: safeString(row.phone, 80),
      email: safeString(row.email, 160),
      telegram: safeString(row.telegram, 160),
      website: safeString(row.website, 240),
      city: safeString(row.city, 120),
    } satisfies ApiV1StudioDesignerContact,
    specializations: safeStringList(row.specializations, 160),
    profileCompleteness: getProfileCompleteness(row),
    servicesSummary: {
      total: catalogs.services.length,
      enabled: catalogs.services.filter(service => service.enabled).length,
      startingPrice: getStartingPrice(catalogs.services),
    },
    packagesSummary: {
      total: catalogs.packages.length,
      enabled: catalogs.packages.filter(pkg => pkg.enabled).length,
      defaultPackageKey: catalogs.packages.find(pkg => pkg.enabled)?.key || '',
    },
    subscriptionsSummary: {
      total: catalogs.subscriptions.length,
      enabled: catalogs.subscriptions.filter(subscription => subscription.enabled).length,
    },
    projectIds: designerProjects.map(project => project.id),
    clientIds,
    activeProjectsCount: designerProjects.filter(project => project.status === 'active').length,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  }
}

function documentClientVisible(row: ApiV1StudioDesignerProjectDocumentRow): boolean {
  const category = safeString(row.category, 80).toLowerCase()
  if (!category || category === 'template' || category === 'internal') return false
  return true
}

function isApprovalDocument(row: ApiV1StudioDesignerProjectDocumentRow): boolean {
  const category = safeString(row.category, 120).toLowerCase()
  const title = safeString(row.title, 240).toLowerCase()
  return category.includes('approval')
    || category.includes('signoff')
    || category.includes('соглас')
    || title.includes('approval')
    || title.includes('соглас')
}

function createDocumentRef(row: ApiV1StudioDesignerProjectDocumentRow): ApiV1StudioDesignerProjectDocumentRef {
  const id = `document:${row.id}`
  return {
    ...createEntityRef('document', id, safeString(row.title, 240) || 'Документ', '/admin/documents'),
    numericId: row.id,
    category: safeString(row.category, 120),
    filename: safeString(row.filename, 240),
    url: safeString(row.url, 500),
    clientVisible: documentClientVisible(row),
    createdAt: toIso(row.createdAt),
  }
}

function createApproval(row: ApiV1StudioDesignerProjectDocumentRow): ApiV1StudioDesignerProjectApproval {
  const id = `approval:document:${row.id}`
  return {
    id,
    entityRef: createEntityRef('approval', id, safeString(row.title, 240) || 'Согласование', '/admin/documents'),
    kind: 'document',
    status: 'pending' satisfies ApiV1StudioApprovalStatus,
    assigneeId: '',
    dueAt: '',
    clientVisible: documentClientVisible(row),
    actions: [],
  }
}

function createRoadmap(
  project: ApiV1StudioDesignerProjectRow,
  pkg: DesignerPackage | null,
): ApiV1StudioDesignerProjectRoadmapItem[] {
  const status = normalizeDesignerStatus(project.status)
  const done = status === 'completed' || status === 'archived'
  const active = status === 'active'
  const paused = status === 'paused'
  const sourceItems = pkg?.serviceKeys?.length
    ? unique(pkg.serviceKeys)
      .map(key => SERVICE_PHASE_HINTS[key])
      .filter((item): item is { phaseKey: string; title: string } => Boolean(item))
    : ROADMAP_FALLBACK
  const deduped = unique(sourceItems.map(item => `${item.phaseKey}:${item.title}`))
    .map(value => {
      const [phaseKey, ...titleParts] = value.split(':')
      return { phaseKey, title: titleParts.join(':') }
    })

  return deduped.map((item, index) => ({
    id: `designer_project:${project.id}:roadmap:${item.phaseKey}:${index}`,
    title: item.title,
    phaseKey: item.phaseKey,
    status: done ? 'done' : paused ? 'blocked' : active && index === 0 ? 'active' : 'not_started',
    clientVisible: true,
    source: pkg?.serviceKeys?.length ? 'package' : 'default',
  }))
}

function createClientRef(row: ApiV1StudioDesignerProjectClientRow): ApiV1StudioDesignerProjectClientRef {
  const id = `client:${row.clientId}`
  return {
    ...createEntityRef('client', id, safeString(row.name, 240) || `Клиент #${row.clientId}`, '/admin/clients'),
    numericId: row.clientId,
    phone: safeString(row.phone, 80),
    email: safeString(row.email, 160),
    clientVisible: true,
  }
}

function createContractorRef(row: ApiV1StudioDesignerProjectContractorRow): ApiV1StudioDesignerProjectContractorRef {
  const id = `contractor:${row.contractorId}`
  const displayName = safeString(row.companyName, 240) || safeString(row.name, 240) || `Подрядчик #${row.contractorId}`
  return {
    ...createEntityRef('contractor', id, displayName, '/admin/contractors'),
    numericId: row.contractorId,
    role: safeString(row.role, 120),
    clientVisible: false,
  }
}

function createDesignProjectDto(input: {
  row: ApiV1StudioDesignerProjectRow
  designer: ApiV1StudioDesignerRow
  catalogs: NormalizedDesignerCatalogs
  clients: ApiV1StudioDesignerProjectClientRow[]
  contractors: ApiV1StudioDesignerProjectContractorRow[]
  documents: ApiV1StudioDesignerProjectDocumentRow[]
  workItemCounts: ApiV1StudioDesignerProjectWorkItemCountRow | undefined
}): ApiV1StudioDesignerProject {
  const row = input.row
  const designerName = safeString(input.designer.name, 240) || `Дизайнер #${input.designer.id}`
  const id = `designer_project:${row.id}`
  const designerId = `designer:${input.designer.id}`
  const status = normalizeDesignerStatus(row.status)
  const pkg = getPackageForProject(row, input.catalogs)
  const documentItems = input.documents.map(createDocumentRef)
  const approvalItems = input.documents.filter(isApprovalDocument).map(createApproval)
  const workItemCounts = input.workItemCounts
  const tasksTotal = asInt(workItemCounts?.total)
  const tasksDone = asInt(workItemCounts?.done)
  const tasksOverdue = asInt(workItemCounts?.overdue)

  return {
    id,
    numericId: row.id,
    addressableId: id,
    entityRef: createEntityRef('designer_project', id, row.project.title || `Дизайн-проект #${row.id}`, `/admin/projects/${row.project.slug}`),
    designer: createEntityRef('designer', designerId, designerName, `/admin/designers?id=${input.designer.id}`),
    project: createProjectRef(row.project),
    title: row.project.title || `Дизайн-проект #${row.id}`,
    status,
    statusLabel: DESIGNER_PROJECT_STATUS_LABELS[status] || status,
    clientVisible: true,
    financial: {
      packageKey: safeString(pkg?.key || row.packageKey, 160),
      packageTitle: safeString(pkg?.title, 240),
      pricePerSqm: row.pricePerSqm ?? null,
      area: row.area ?? null,
      totalPrice: row.totalPrice ?? null,
      clientVisible: false,
    },
    clients: input.clients.map(createClientRef),
    contractors: input.contractors.map(createContractorRef),
    documents: {
      total: documentItems.length,
      clientVisible: documentItems.filter(document => document.clientVisible).length,
      approvals: approvalItems.length,
      items: documentItems,
    },
    approvals: {
      total: approvalItems.length,
      pending: approvalItems.filter(approval => approval.status === 'pending').length,
      items: approvalItems,
    },
    roadmap: createRoadmap(row, pkg),
    construction: {
      status: tasksTotal ? 'linked' : 'not_linked',
      projectAddressableId: `project:${row.project.slug}`,
      tasksTotal,
      tasksDone,
      tasksOpen: Math.max(0, tasksTotal - tasksDone),
      tasksOverdue,
      clientVisible: true,
    },
    notes: safeString(row.notes, 1000),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.project.updatedAt),
  }
}

function matchesProject(project: ApiV1StudioDesignerProject, q: string): boolean {
  if (!q) return true
  const haystack = [
    project.title,
    project.project.slug,
    project.project.status,
    project.status,
    project.statusLabel,
    project.designer.displayName,
    project.clients.map(client => `${client.displayName} ${client.phone} ${client.email}`).join(' '),
    project.contractors.map(contractor => `${contractor.displayName} ${contractor.role}`).join(' '),
    project.documents.items.map(document => `${document.displayName} ${document.category}`).join(' '),
  ].join(' ').toLowerCase()
  return haystack.includes(q)
}

function sortProjects(projects: ApiV1StudioDesignerProject[]): ApiV1StudioDesignerProject[] {
  return [...projects].sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === 'active') return -1
      if (b.status === 'active') return 1
    }
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

export function createApiV1StudioDesignerCabinetDto(input: {
  designers: ApiV1StudioDesignerRow[]
  designerProjects: ApiV1StudioDesignerProjectRow[]
  clients: ApiV1StudioDesignerProjectClientRow[]
  contractors: ApiV1StudioDesignerProjectContractorRow[]
  documents: ApiV1StudioDesignerProjectDocumentRow[]
  workItemCountsByProjectId: Record<number, ApiV1StudioDesignerProjectWorkItemCountRow>
  filters: {
    q?: string
    designerId?: number | null
    projectSlug?: string
    limit?: number
    offset?: number
  }
}): ApiV1StudioDesignerCabinet {
  const q = safeString(input.filters.q).toLowerCase()
  const designerId = input.filters.designerId && Number.isInteger(input.filters.designerId) ? input.filters.designerId : null
  const projectSlug = safeString(input.filters.projectSlug, 160)
  const limit = Math.max(1, Math.min(200, asInt(input.filters.limit) || 100))
  const offset = Math.max(0, asInt(input.filters.offset))
  const designersById = new Map(input.designers.map(designer => [designer.id, designer]))
  const catalogsByDesignerId = new Map(input.designers.map(designer => [designer.id, normalizeCatalogs(designer)]))
  const clientsByDesignerProjectId = new Map<number, ApiV1StudioDesignerProjectClientRow[]>()
  const contractorsByDesignerProjectId = new Map<number, ApiV1StudioDesignerProjectContractorRow[]>()
  const documentsByProjectId = new Map<number, ApiV1StudioDesignerProjectDocumentRow[]>()

  for (const client of input.clients) {
    const current = clientsByDesignerProjectId.get(client.designerProjectId) || []
    current.push(client)
    clientsByDesignerProjectId.set(client.designerProjectId, current)
  }

  for (const contractor of input.contractors) {
    const current = contractorsByDesignerProjectId.get(contractor.designerProjectId) || []
    current.push(contractor)
    contractorsByDesignerProjectId.set(contractor.designerProjectId, current)
  }

  for (const document of input.documents) {
    if (!document.projectId) continue
    const current = documentsByProjectId.get(document.projectId) || []
    current.push(document)
    documentsByProjectId.set(document.projectId, current)
  }

  const allProjectDtos = input.designerProjects
    .map((row) => {
      const designer = designersById.get(row.designerId)
      const catalogs = catalogsByDesignerId.get(row.designerId)
      if (!designer || !catalogs) return null
      return createDesignProjectDto({
        row,
        designer,
        catalogs,
        clients: clientsByDesignerProjectId.get(row.id) || [],
        contractors: contractorsByDesignerProjectId.get(row.id) || [],
        documents: documentsByProjectId.get(row.projectId) || [],
        workItemCounts: input.workItemCountsByProjectId[row.projectId],
      })
    })
    .filter((project): project is ApiV1StudioDesignerProject => Boolean(project))

  const filteredProjects = sortProjects(allProjectDtos)
    .filter(project => !designerId || project.designer.id === `designer:${designerId}`)
    .filter(project => !projectSlug || project.project.slug === projectSlug)
    .filter(project => matchesProject(project, q))
  const pagedProjects = filteredProjects.slice(offset, offset + limit)
  const visibleDesignerIds = new Set(filteredProjects.map(project => Number(project.designer.id.replace('designer:', ''))))
  const designerDtos = input.designers
    .filter(designer => !designerId || designer.id === designerId)
    .filter(designer => !visibleDesignerIds.size || visibleDesignerIds.has(designer.id))
    .map(designer => createDesignerDto(
      designer,
      catalogsByDesignerId.get(designer.id) || normalizeCatalogs(designer),
      allProjectDtos,
    ))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'ru'))

  const uniqueClientIds = unique(filteredProjects.flatMap(project => project.clients.map(client => client.id)))
  const uniqueContractorIds = unique(filteredProjects.flatMap(project => project.contractors.map(contractor => contractor.id)))

  return {
    summary: {
      designers: designerDtos.length,
      designProjects: filteredProjects.length,
      activeDesignProjects: filteredProjects.filter(project => project.status === 'active').length,
      pausedDesignProjects: filteredProjects.filter(project => project.status === 'paused').length,
      completedDesignProjects: filteredProjects.filter(project => project.status === 'completed').length,
      clients: uniqueClientIds.length,
      contractors: uniqueContractorIds.length,
      documents: filteredProjects.reduce((sum, project) => sum + project.documents.total, 0),
      approvals: filteredProjects.reduce((sum, project) => sum + project.approvals.total, 0),
      pendingApprovals: filteredProjects.reduce((sum, project) => sum + project.approvals.pending, 0),
      constructionLinkedProjects: filteredProjects.filter(project => project.construction.status === 'linked').length,
    },
    designers: designerDtos,
    projects: pagedProjects,
    filters: {
      q,
      designerId,
      projectSlug,
      limit,
      offset,
      total: filteredProjects.length,
    },
  }
}
