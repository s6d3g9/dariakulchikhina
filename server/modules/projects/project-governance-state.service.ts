import { getProjectRelationsSnapshot, type ProjectRelationsSnapshot } from '~/server/modules/projects/project-relations.service'
import * as repo from '~/server/modules/projects/project-governance.repository'
import type {
  HybridControl,
} from '~/shared/types/project'
import type {
  ProjectGovernanceSummaryParticipant,
  ProjectParticipantRoleKey,
  ProjectParticipantSourceKind,
  ProjectResponsibilityKey,
  ProjectScopeAssignmentOrigin,
  ProjectScopeParticipantSummary,
  ProjectScopeSource,
  ProjectScopeType,
} from '~/shared/types/project-governance'
import {
  PROJECT_PARTICIPANT_ROLE_KEYS,
  PROJECT_PARTICIPANT_SOURCE_KINDS,
  PROJECT_RESPONSIBILITY_KEYS,
  PROJECT_SCOPE_ASSIGNMENT_STATUSES,
  PROJECT_SCOPE_SOURCES,
  PROJECT_SCOPE_TYPES,
} from '~/shared/types/project-governance'
import {
  getProjectParticipantRoleLabel,
  getProjectResponsibilityLabel,
} from '~/shared/utils/project-governance'
import { buildHybridCoordinationBrief, ensureHybridControl } from '~/shared/utils/project-control'

export type ProjectGovernanceProjectRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  pages: string[]
  profile: Record<string, unknown>
  updatedAt: Date | string | null
}

export type GovernanceSummaryOptions = {
  control?: HybridControl
  relations?: ProjectRelationsSnapshot | null
}

export type GovernanceState = {
  project: ProjectGovernanceProjectRow
  control: HybridControl
  relations: ProjectRelationsSnapshot | null
  participants: ProjectGovernanceSummaryParticipant[]
  participantByPersistedId: Map<number, ProjectGovernanceSummaryParticipant>
  assignmentRows: Array<{
    id: number
    participantId: number
    scopeType: string
    scopeSource: string
    scopeId: string
    responsibility: string
    status: string
    dueDate: string | null
    notes: string | null
    assignedAt: Date | string
    updatedAt: Date | string
  }>
  settingsRows: Array<{
    id: number
    scopeType: string
    scopeSource: string
    scopeId: string
    settings: Record<string, string | number | boolean | null>
    updatedAt: Date | string
  }>
  revision: string
  coordination: ReturnType<typeof buildHybridCoordinationBrief>
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function toProfileRecord(value: unknown) {
  return isRecord(value) ? value : {}
}

export function normalizeProjectRow(project: ProjectGovernanceProjectRow | null | undefined): ProjectGovernanceProjectRow | null {
  if (!project) {
    return null
  }

  return {
    id: Number(project.id || 0),
    slug: String(project.slug || '').trim(),
    title: String(project.title || '').trim(),
    status: String(project.status || '').trim(),
    projectType: String(project.projectType || '').trim(),
    pages: Array.isArray(project.pages) ? project.pages.map(value => String(value || '')) : [],
    profile: toProfileRecord(project.profile),
    updatedAt: project.updatedAt || null,
  }
}

export function joinParts(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' · ')
}

export function getRevision(value: Date | string | null) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'string' && value.trim()) {
    return value
  }

  return new Date().toISOString()
}

export function normalizeSourceKind(value?: string | null): ProjectParticipantSourceKind {
  return PROJECT_PARTICIPANT_SOURCE_KINDS.includes(value as ProjectParticipantSourceKind)
    ? value as ProjectParticipantSourceKind
    : 'custom'
}

export function normalizeRoleKey(value?: string | null): ProjectParticipantRoleKey {
  return PROJECT_PARTICIPANT_ROLE_KEYS.includes(value as ProjectParticipantRoleKey)
    ? value as ProjectParticipantRoleKey
    : 'other'
}

export function normalizeResponsibility(value?: string | null): ProjectResponsibilityKey {
  return PROJECT_RESPONSIBILITY_KEYS.includes(value as ProjectResponsibilityKey)
    ? value as ProjectResponsibilityKey
    : 'observer'
}

export function normalizeScopeType(value?: string | null): ProjectScopeType {
  return PROJECT_SCOPE_TYPES.includes(value as ProjectScopeType)
    ? value as ProjectScopeType
    : 'project'
}

export function normalizeScopeSource(value?: string | null): ProjectScopeSource {
  return PROJECT_SCOPE_SOURCES.includes(value as ProjectScopeSource)
    ? value as ProjectScopeSource
    : 'project'
}

export function normalizeAssignmentStatus(value?: string | null) {
  return PROJECT_SCOPE_ASSIGNMENT_STATUSES.includes(value as typeof PROJECT_SCOPE_ASSIGNMENT_STATUSES[number])
    ? value as typeof PROJECT_SCOPE_ASSIGNMENT_STATUSES[number]
    : 'active'
}

export function mapTeamRoleToParticipantRole(role?: string): ProjectParticipantRoleKey {
  switch (role) {
    case 'manager':
      return 'manager'
    case 'designer':
    case 'architect':
      return 'designer'
    case 'contractor':
      return 'contractor'
    case 'client':
      return 'client'
    default:
      return 'other'
  }
}

export function isGovernanceTableMissing(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return /project_participants|project_scope_assignments|project_scope_settings/i.test(message)
    && /does not exist|relation .* does not exist|no such table/i.test(message)
}

export async function safeGovernanceQuery<T>(loader: () => Promise<T>, fallback: T) {
  try {
    return await loader()
  } catch (error) {
    if (isGovernanceTableMissing(error)) {
      return fallback
    }

    throw error
  }
}

export function buildParticipantSecondary(parts: Array<string | null | undefined>) {
  return joinParts(parts)
}

export function derivedParticipantKey(participant: { sourceKind: ProjectParticipantSourceKind; sourceId?: number; persistedId?: number; roleKey: ProjectParticipantRoleKey; displayName: string }) {
  if (participant.sourceId) {
    return `source:${participant.sourceKind}:${participant.sourceId}`
  }

  if (participant.persistedId) {
    return `participant:${participant.persistedId}`
  }

  return `custom:${participant.roleKey}:${participant.displayName.trim().toLowerCase()}`
}

export function sortParticipants(left: ProjectGovernanceSummaryParticipant, right: ProjectGovernanceSummaryParticipant) {
  if (left.isPrimary !== right.isPrimary) {
    return Number(right.isPrimary) - Number(left.isPrimary)
  }

  if (left.roleKey !== right.roleKey) {
    return getProjectParticipantRoleLabel(left.roleKey).localeCompare(getProjectParticipantRoleLabel(right.roleKey), 'ru')
  }

  return left.displayName.localeCompare(right.displayName, 'ru')
}

export async function readPersistedGovernanceState(projectId: number) {
  const [participantRows, assignmentRows, settingsRows] = await Promise.all([
    repo.readGovernanceParticipants(projectId),
    repo.readGovernanceAssignments(projectId),
    repo.readGovernanceSettings(projectId),
  ])
  return { participantRows, assignmentRows, settingsRows }
}

export function legacyActiveTaskCount(control: HybridControl, displayName: string) {
  const normalizedName = displayName.trim().toLowerCase()
  if (!normalizedName) {
    return 0
  }

  return control.sprints
    .flatMap(sprint => sprint.tasks)
    .filter(task => (task.assignee || '').trim().toLowerCase() === normalizedName && task.status !== 'done')
    .length
}

export function buildDerivedParticipants(project: ProjectGovernanceProjectRow, control: HybridControl, relations: ProjectRelationsSnapshot | null): ProjectGovernanceSummaryParticipant[] {
  const derived: ProjectGovernanceSummaryParticipant[] = []

  for (const client of relations?.linked.clients || []) {
    derived.push({
      id: `linked:client:${client.id}`,
      projectId: project.id,
      sourceKind: 'client',
      sourceId: client.id,
      roleKey: 'client',
      displayName: client.name,
      phone: client.phone || undefined,
      email: client.email || undefined,
      messengerNick: client.messengerNick || undefined,
      isPrimary: true,
      status: 'active',
      meta: {},
      secondary: buildParticipantSecondary([getProjectParticipantRoleLabel('client'), client.phone, client.email]),
      assignmentCount: 0,
      activeTaskCount: legacyActiveTaskCount(control, client.name),
    })
  }

  for (const contractor of relations?.linked.contractors || []) {
    derived.push({
      id: `linked:contractor:${contractor.id}`,
      projectId: project.id,
      sourceKind: 'contractor',
      sourceId: contractor.id,
      roleKey: 'contractor',
      displayName: contractor.name,
      companyName: contractor.companyName || undefined,
      phone: contractor.phone || undefined,
      email: contractor.email || undefined,
      messengerNick: contractor.messengerNick || undefined,
      isPrimary: false,
      status: 'active',
      meta: {},
      secondary: buildParticipantSecondary([getProjectParticipantRoleLabel('contractor'), contractor.companyName, contractor.phone]),
      assignmentCount: 0,
      activeTaskCount: legacyActiveTaskCount(control, contractor.name),
    })
  }

  for (const designer of relations?.linked.designers || []) {
    derived.push({
      id: `linked:designer:${designer.id}`,
      projectId: project.id,
      sourceKind: 'designer',
      sourceId: designer.id,
      roleKey: 'designer',
      displayName: designer.name,
      companyName: designer.companyName || undefined,
      phone: designer.phone || undefined,
      email: designer.email || undefined,
      isPrimary: false,
      status: 'active',
      meta: {},
      secondary: buildParticipantSecondary([getProjectParticipantRoleLabel('designer'), designer.companyName, designer.phone]),
      assignmentCount: 0,
      activeTaskCount: legacyActiveTaskCount(control, designer.name),
    })
  }

  for (const seller of relations?.linked.sellers || []) {
    derived.push({
      id: `linked:seller:${seller.id}`,
      projectId: project.id,
      sourceKind: 'seller',
      sourceId: seller.id,
      roleKey: 'seller',
      displayName: seller.name,
      companyName: seller.companyName || undefined,
      messengerNick: seller.messengerNick || undefined,
      isPrimary: false,
      status: 'active',
      meta: {},
      secondary: buildParticipantSecondary([getProjectParticipantRoleLabel('seller'), seller.companyName, seller.contactPerson]),
      assignmentCount: 0,
      activeTaskCount: legacyActiveTaskCount(control, seller.name),
    })
  }

  for (const manager of relations?.linked.managers || []) {
    derived.push({
      id: `linked:manager:${manager.id}`,
      projectId: project.id,
      sourceKind: 'manager',
      sourceId: manager.id,
      roleKey: 'manager',
      displayName: manager.name,
      phone: manager.phone || undefined,
      email: manager.email || undefined,
      isPrimary: manager.role === 'lead',
      status: 'active',
      meta: {},
      secondary: buildParticipantSecondary([getProjectParticipantRoleLabel('manager'), manager.role, manager.phone]),
      assignmentCount: 0,
      activeTaskCount: legacyActiveTaskCount(control, manager.name),
    })
  }

  for (const member of control.team || []) {
    const roleKey = mapTeamRoleToParticipantRole(member.role)
    derived.push({
      id: `team:${member.id}`,
      projectId: project.id,
      sourceKind: 'custom',
      roleKey,
      displayName: member.name,
      isPrimary: false,
      status: 'active',
      phone: undefined,
      email: undefined,
      companyName: undefined,
      messengerNick: undefined,
      notes: undefined,
      meta: {
        teamMemberId: member.id,
        notifyBy: member.notifyBy,
      },
      secondary: buildParticipantSecondary([getProjectParticipantRoleLabel(roleKey), member.contact, member.notifyBy]),
      assignmentCount: 0,
      activeTaskCount: legacyActiveTaskCount(control, member.name),
    })
  }

  return derived
}

export function mergeParticipants(
  control: HybridControl,
  project: ProjectGovernanceProjectRow,
  derivedParticipants: ProjectGovernanceSummaryParticipant[],
  participantRows: Awaited<ReturnType<typeof readPersistedGovernanceState>>['participantRows'],
  assignmentRows: Awaited<ReturnType<typeof readPersistedGovernanceState>>['assignmentRows'],
) {
  const byKey = new Map<string, ProjectGovernanceSummaryParticipant>()

  derivedParticipants.forEach((participant) => {
    byKey.set(derivedParticipantKey(participant), participant)
  })

  participantRows.forEach((row) => {
    const sourceKind = normalizeSourceKind(row.sourceKind)
    const roleKey = normalizeRoleKey(row.roleKey)
    const participantAssignments = assignmentRows.filter(item => item.participantId === row.id && normalizeAssignmentStatus(item.status) !== 'removed')
    const activeTaskCount = participantAssignments.filter(item => normalizeScopeType(item.scopeType) === 'task' && normalizeAssignmentStatus(item.status) === 'active').length

    byKey.set(derivedParticipantKey({
      sourceKind,
      sourceId: row.sourceId || undefined,
      persistedId: row.id,
      roleKey,
      displayName: row.displayName,
    }), {
      id: `participant:${row.id}`,
      persistedId: row.id,
      projectId: project.id,
      sourceKind,
      sourceId: row.sourceId || undefined,
      roleKey,
      displayName: row.displayName,
      companyName: row.companyName || undefined,
      phone: row.phone || undefined,
      email: row.email || undefined,
      messengerNick: row.messengerNick || undefined,
      isPrimary: Boolean(row.isPrimary),
      status: row.status === 'archived' ? 'archived' : 'active',
      notes: row.notes || undefined,
      meta: (isRecord(row.meta) ? row.meta : {}) as Record<string, string | number | boolean | null>,
      secondary: buildParticipantSecondary([
        getProjectParticipantRoleLabel(roleKey),
        row.companyName,
        row.phone,
        participantAssignments.length ? `${participantAssignments.length} назначений` : '',
      ]),
      assignmentCount: participantAssignments.length,
      activeTaskCount: activeTaskCount || legacyActiveTaskCount(control, row.displayName),
    })
  })

  return Array.from(byKey.values()).sort(sortParticipants)
}

export function getScopeCounts(control: HybridControl) {
  return {
    project: 1,
    phase: control.phases.length,
    sprint: control.sprints.length,
    task: control.sprints.reduce((total, sprint) => total + sprint.tasks.length, 0),
    document: 0,
    service: 0,
  }
}

export async function getGovernanceState(projectInput: ProjectGovernanceProjectRow, options: GovernanceSummaryOptions = {}): Promise<GovernanceState> {
  const project = normalizeProjectRow(projectInput)
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  const control = options.control || ensureHybridControl(project.profile?.hybridControl, project)
  const relations = options.relations === undefined ? await getProjectRelationsSnapshot(project.slug) : options.relations
  const { participantRows, assignmentRows, settingsRows } = await readPersistedGovernanceState(project.id)
  const participants = mergeParticipants(
    control,
    project,
    buildDerivedParticipants(project, control, relations),
    participantRows,
    assignmentRows,
  )
  const participantByPersistedId = new Map(
    participants
      .filter(participant => participant.persistedId)
      .map(participant => [participant.persistedId as number, participant]),
  )

  return {
    project,
    control,
    relations,
    participants,
    participantByPersistedId,
    assignmentRows,
    settingsRows: settingsRows.map(row => ({
      ...row,
      settings: (isRecord(row.settings) ? row.settings : {}) as Record<string, string | number | boolean | null>,
    })),
    revision: getRevision(project.updatedAt),
    coordination: buildHybridCoordinationBrief(control, { projectSlug: project.slug }),
  }
}

export function mapParticipantSourceToCatalogKind(sourceKind: ProjectParticipantSourceKind): 'client' | 'contractor' | 'designer' | 'seller' | 'manager' | 'custom' {
  if (sourceKind === 'client' || sourceKind === 'contractor' || sourceKind === 'designer' || sourceKind === 'seller' || sourceKind === 'manager') {
    return sourceKind
  }

  return 'custom'
}

export async function getProjectGovernanceProject(projectSlug: string): Promise<ProjectGovernanceProjectRow | null> {
  const project = await repo.findGovernanceProject(projectSlug)
  return normalizeProjectRow(project as ProjectGovernanceProjectRow | null)
}

export async function getProjectGovernanceProjectOrThrow(projectSlug: string) {
  const project = await getProjectGovernanceProject(projectSlug)
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  return project
}
