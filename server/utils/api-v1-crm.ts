import type {
  ApiV1CrmClient,
  ApiV1CrmClients,
  ApiV1CrmProject,
  ApiV1CrmProjectClientRef,
  ApiV1CrmProjectLink,
  ApiV1CrmProjects,
} from '~/shared/types/api-v1'

export type CrmClientRow = {
  id: number
  name: string
  phone: string | null
  email: string | null
  messenger: string | null
  messengerNick: string | null
  address: string | null
  notes: string | null
  createdAt: Date | string | null
}

export type CrmProjectRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  profile: Record<string, unknown> | null
  createdAt: Date | string | null
  updatedAt: Date | string | null
}

export type CrmCountByProjectId = Record<number, number>

export type CrmWorkItemCountsByProjectId = Record<number, {
  total: number
  done: number
  overdue: number
}>

type ClientProjectIndex = {
  byClientId: Map<number, CrmProjectRow[]>
  clientIdsByProjectId: Map<number, number[]>
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
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

export function extractApiV1CrmLinkedClientIds(profile: Record<string, unknown> | null | undefined): number[] {
  const ids = new Set<number>()
  const rawArray = Array.isArray(profile?.client_ids) ? profile.client_ids : []

  for (const rawId of rawArray) {
    const id = Number(rawId)
    if (Number.isInteger(id) && id > 0) ids.add(id)
  }

  const singleId = Number(profile?.client_id)
  if (Number.isInteger(singleId) && singleId > 0) ids.add(singleId)

  return Array.from(ids)
}

export function createApiV1CrmClientProjectIndex(projectRows: CrmProjectRow[]): ClientProjectIndex {
  const byClientId = new Map<number, CrmProjectRow[]>()
  const clientIdsByProjectId = new Map<number, number[]>()

  for (const project of projectRows) {
    const clientIds = extractApiV1CrmLinkedClientIds(project.profile)
    clientIdsByProjectId.set(project.id, clientIds)

    for (const clientId of clientIds) {
      const current = byClientId.get(clientId) || []
      current.push(project)
      byClientId.set(clientId, current)
    }
  }

  return { byClientId, clientIdsByProjectId }
}

function createProjectLink(project: CrmProjectRow): ApiV1CrmProjectLink {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    addressableId: `project:${project.slug}`,
    updatedAt: toIso(project.updatedAt),
  }
}

function getClientCompleteness(client: CrmClientRow) {
  const checks = [client.phone, client.email, client.messengerNick, client.address, client.notes]
  const filled = checks.filter(Boolean).length
  const total = checks.length
  return {
    filled,
    total,
    percent: total ? Math.round((filled / total) * 100) : 0,
  }
}

function createClientDto(
  client: CrmClientRow,
  projectRows: CrmProjectRow[],
  documentCountsByProjectId: CrmCountByProjectId,
  workItemCountsByProjectId: CrmWorkItemCountsByProjectId,
): ApiV1CrmClient {
  const linkedProjects = projectRows.map(createProjectLink)
  const documentsCount = projectRows.reduce((sum, project) => sum + asInt(documentCountsByProjectId[project.id]), 0)
  const openWorkItems = projectRows.reduce((sum, project) => {
    const counts = workItemCountsByProjectId[project.id]
    return sum + Math.max(0, asInt(counts?.total) - asInt(counts?.done))
  }, 0)

  return {
    id: client.id,
    addressableId: `client:${client.id}`,
    displayName: client.name,
    name: client.name,
    phone: asString(client.phone),
    email: asString(client.email),
    messenger: asString(client.messenger),
    messengerNick: asString(client.messengerNick),
    address: asString(client.address),
    notes: asString(client.notes),
    status: linkedProjects.length ? 'active' : 'unlinked',
    profileCompleteness: getClientCompleteness(client),
    linkedProjects,
    projectsCount: linkedProjects.length,
    documentsCount,
    openWorkItems,
    createdAt: toIso(client.createdAt),
  }
}

function matchesClientQuery(client: ApiV1CrmClient, q: string) {
  if (!q) return true
  const haystack = [
    client.displayName,
    client.phone,
    client.email,
    client.messenger,
    client.messengerNick,
    client.address,
    client.linkedProjects.map(project => `${project.title} ${project.slug}`).join(' '),
  ].join(' ').toLowerCase()
  return haystack.includes(q)
}

function sortClients(items: ApiV1CrmClient[]) {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1
    return a.displayName.localeCompare(b.displayName, 'ru')
  })
}

export function createApiV1CrmClientsDto(input: {
  clients: CrmClientRow[]
  projects: CrmProjectRow[]
  documentCountsByProjectId: CrmCountByProjectId
  workItemCountsByProjectId: CrmWorkItemCountsByProjectId
  filters: {
    q?: string
    projectSlug?: string
    limit?: number
    offset?: number
  }
}): ApiV1CrmClients {
  const q = asString(input.filters.q).trim().toLowerCase()
  const projectSlug = asString(input.filters.projectSlug).trim()
  const limit = Math.max(1, Math.min(200, asInt(input.filters.limit) || 100))
  const offset = Math.max(0, asInt(input.filters.offset))
  const index = createApiV1CrmClientProjectIndex(input.projects)

  const allItems = input.clients
    .map(client => createClientDto(
      client,
      index.byClientId.get(client.id) || [],
      input.documentCountsByProjectId,
      input.workItemCountsByProjectId,
    ))
    .filter(client => !projectSlug || client.linkedProjects.some(project => project.slug === projectSlug))
    .filter(client => matchesClientQuery(client, q))

  const sortedItems = sortClients(allItems)
  const pagedItems = sortedItems.slice(offset, offset + limit)
  const summaryBase = sortedItems

  return {
    summary: {
      total: summaryBase.length,
      linked: summaryBase.filter(client => client.projectsCount > 0).length,
      unlinked: summaryBase.filter(client => client.projectsCount === 0).length,
      withMessenger: summaryBase.filter(client => client.messenger || client.messengerNick).length,
      documents: summaryBase.reduce((sum, client) => sum + client.documentsCount, 0),
      openWorkItems: summaryBase.reduce((sum, client) => sum + client.openWorkItems, 0),
    },
    items: pagedItems,
    filters: {
      q,
      projectSlug,
      limit,
      offset,
      total: sortedItems.length,
    },
  }
}

function createClientRef(client: CrmClientRow): ApiV1CrmProjectClientRef {
  return {
    id: client.id,
    addressableId: `client:${client.id}`,
    displayName: client.name,
    phone: asString(client.phone),
    email: asString(client.email),
    messengerNick: asString(client.messengerNick),
  }
}

function matchesProjectQuery(project: ApiV1CrmProject, q: string) {
  if (!q) return true
  const haystack = [
    project.title,
    project.slug,
    project.status,
    project.projectType,
    project.clientRefs.map(client => `${client.displayName} ${client.phone} ${client.email}`).join(' '),
  ].join(' ').toLowerCase()
  return haystack.includes(q)
}

function createProjectDto(
  project: CrmProjectRow,
  clientsById: Map<number, CrmClientRow>,
  clientIds: number[],
  documentCountsByProjectId: CrmCountByProjectId,
  workItemCountsByProjectId: CrmWorkItemCountsByProjectId,
): ApiV1CrmProject {
  const counts = workItemCountsByProjectId[project.id] || { total: 0, done: 0, overdue: 0 }
  const clientRefs = clientIds
    .map(clientId => clientsById.get(clientId))
    .filter((client): client is CrmClientRow => Boolean(client))
    .map(createClientRef)

  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType,
    addressableId: `project:${project.slug}`,
    clientRefs,
    documentsCount: asInt(documentCountsByProjectId[project.id]),
    workItems: {
      total: asInt(counts.total),
      done: asInt(counts.done),
      open: Math.max(0, asInt(counts.total) - asInt(counts.done)),
      overdue: asInt(counts.overdue),
    },
    createdAt: toIso(project.createdAt),
    updatedAt: toIso(project.updatedAt),
  }
}

export function createApiV1CrmProjectsDto(input: {
  clients: CrmClientRow[]
  projects: CrmProjectRow[]
  documentCountsByProjectId: CrmCountByProjectId
  workItemCountsByProjectId: CrmWorkItemCountsByProjectId
  filters: {
    q?: string
    clientId?: number | null
    limit?: number
    offset?: number
  }
}): ApiV1CrmProjects {
  const q = asString(input.filters.q).trim().toLowerCase()
  const clientId = input.filters.clientId && Number.isInteger(input.filters.clientId) ? input.filters.clientId : null
  const limit = Math.max(1, Math.min(200, asInt(input.filters.limit) || 100))
  const offset = Math.max(0, asInt(input.filters.offset))
  const index = createApiV1CrmClientProjectIndex(input.projects)
  const clientsById = new Map(input.clients.map(client => [client.id, client]))

  const allItems = input.projects
    .map(project => createProjectDto(
      project,
      clientsById,
      index.clientIdsByProjectId.get(project.id) || [],
      input.documentCountsByProjectId,
      input.workItemCountsByProjectId,
    ))
    .filter(project => !clientId || project.clientRefs.some(client => client.id === clientId))
    .filter(project => matchesProjectQuery(project, q))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  const pagedItems = allItems.slice(offset, offset + limit)

  return {
    summary: {
      total: allItems.length,
      withClients: allItems.filter(project => project.clientRefs.length > 0).length,
      withoutClients: allItems.filter(project => project.clientRefs.length === 0).length,
      documents: allItems.reduce((sum, project) => sum + project.documentsCount, 0),
      openWorkItems: allItems.reduce((sum, project) => sum + project.workItems.open, 0),
      overdueWorkItems: allItems.reduce((sum, project) => sum + project.workItems.overdue, 0),
    },
    items: pagedItems,
    filters: {
      q,
      clientId,
      limit,
      offset,
      total: allItems.length,
    },
  }
}
