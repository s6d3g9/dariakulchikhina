import { and, asc, eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import {
  contractors,
  documents,
  projectExtraServices,
  projectParticipants,
  projects,
  projectScopeAssignments,
  projectScopeSettings,
  workStatusItems,
} from '~/server/db/schema'
import { getProjectRelationsSnapshot, type ProjectRelationsSnapshot } from '~/server/utils/project-relations'
import type {
  HybridControl,
  HybridControlPhase,
  HybridControlSprint,
  HybridControlTask,
} from '~/shared/types/project'
import type {
  CreateProjectParticipant,
  CreateProjectScopeAssignment,
} from '~/shared/types/project-governance'
import {
  PROJECT_PARTICIPANT_ROLE_KEYS,
  PROJECT_PARTICIPANT_SOURCE_KINDS,
  PROJECT_RESPONSIBILITY_KEYS,
  PROJECT_SCOPE_ASSIGNMENT_STATUSES,
  PROJECT_SCOPE_SOURCES,
  PROJECT_SCOPE_TYPES,
  type ProjectGovernanceDetailItem,
  type ProjectGovernanceSummary,
  type ProjectGovernanceSummaryParticipant,
  type ProjectParticipant,
  type ProjectParticipantRoleKey,
  type ProjectParticipantSourceKind,
  type ProjectResponsibilityKey,
  type ProjectScopeAssignment,
  type ProjectScopeAssignmentOrigin,
  type ProjectScopeDetailBundle,
  type ProjectScopeLink,
  type ProjectScopeParticipantSummary,
  type ProjectScopeRuleSummary,
  type ProjectScopeSource,
  type ProjectScopeSettings,
  type ProjectScopeTaskSummary,
  type ProjectScopeType,
  type UpdateProjectParticipant,
  type UpdateProjectScopeAssignment,
  type UpdateProjectScopeSettings,
} from '~/shared/types/project-governance'
import {
  buildDefaultProjectScopeSettings,
  buildProjectScopeRefKey,
  buildProjectScopeSettingEntries,
  getProjectParticipantRoleLabel,
  getProjectResponsibilityLabel,
} from '~/shared/utils/project-governance'
import { buildHybridCoordinationBrief, ensureHybridControl, getHybridCommunicationChannelLabel } from '~/shared/utils/project-control'

type ProjectGovernanceProjectRow = {
  id: number
  slug: string
  title: string
  status: string
  projectType: string
  pages: string[]
  profile: Record<string, unknown>
  updatedAt: Date | string | null
}

type GovernanceSummaryOptions = {
  control?: HybridControl
  relations?: ProjectRelationsSnapshot | null
}

type GovernanceState = {
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

type ResolvedScopeContext = {
  scopeType: ProjectScopeType
  scopeSource: ProjectScopeSource
  scopeId: string
  title: string
  subtitle: string
  status: string
  statusLabel: string
  core: Record<string, unknown>
  objectItems: ProjectGovernanceDetailItem[]
  actionItems: ProjectGovernanceDetailItem[]
  linkedScopes: ProjectScopeLink[]
  tasks: ProjectScopeTaskSummary[]
  legacyParticipants: Array<{
    displayName: string
    roleKey?: ProjectParticipantRoleKey
    responsibility: ProjectResponsibilityKey
    secondary?: string
  }>
}

type CanonicalScopeRef = {
  scopeType: ProjectScopeType
  scopeSource: ProjectScopeSource
  scopeId: string
}

const DANGEROUS_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const projectParticipantReturning = {
  id: projectParticipants.id,
  projectId: projectParticipants.projectId,
  sourceKind: projectParticipants.sourceKind,
  sourceId: projectParticipants.sourceId,
  roleKey: projectParticipants.roleKey,
  displayName: projectParticipants.displayName,
  companyName: projectParticipants.companyName,
  phone: projectParticipants.phone,
  email: projectParticipants.email,
  messengerNick: projectParticipants.messengerNick,
  isPrimary: projectParticipants.isPrimary,
  status: projectParticipants.status,
  notes: projectParticipants.notes,
  meta: projectParticipants.meta,
}

const projectScopeAssignmentReturning = {
  id: projectScopeAssignments.id,
  projectId: projectScopeAssignments.projectId,
  participantId: projectScopeAssignments.participantId,
  scopeType: projectScopeAssignments.scopeType,
  scopeSource: projectScopeAssignments.scopeSource,
  scopeId: projectScopeAssignments.scopeId,
  responsibility: projectScopeAssignments.responsibility,
  allocationPercent: projectScopeAssignments.allocationPercent,
  status: projectScopeAssignments.status,
  dueDate: projectScopeAssignments.dueDate,
  notes: projectScopeAssignments.notes,
  meta: projectScopeAssignments.meta,
  assignedBy: projectScopeAssignments.assignedBy,
  assignedAt: projectScopeAssignments.assignedAt,
  updatedAt: projectScopeAssignments.updatedAt,
}

const projectScopeSettingsReturning = {
  id: projectScopeSettings.id,
  projectId: projectScopeSettings.projectId,
  scopeType: projectScopeSettings.scopeType,
  scopeSource: projectScopeSettings.scopeSource,
  scopeId: projectScopeSettings.scopeId,
  settings: projectScopeSettings.settings,
  updatedAt: projectScopeSettings.updatedAt,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toProfileRecord(value: unknown) {
  return isRecord(value) ? value : {}
}

function normalizeProjectRow(project: ProjectGovernanceProjectRow | null | undefined): ProjectGovernanceProjectRow | null {
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

function joinParts(parts: Array<string | null | undefined>) {
  return parts.filter(Boolean).join(' · ')
}

function getRevision(value: Date | string | null) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'string' && value.trim()) {
    return value
  }

  return new Date().toISOString()
}

function normalizeSourceKind(value?: string | null): ProjectParticipantSourceKind {
  return PROJECT_PARTICIPANT_SOURCE_KINDS.includes(value as ProjectParticipantSourceKind)
    ? value as ProjectParticipantSourceKind
    : 'custom'
}

function normalizeRoleKey(value?: string | null): ProjectParticipantRoleKey {
  return PROJECT_PARTICIPANT_ROLE_KEYS.includes(value as ProjectParticipantRoleKey)
    ? value as ProjectParticipantRoleKey
    : 'other'
}

function normalizeResponsibility(value?: string | null): ProjectResponsibilityKey {
  return PROJECT_RESPONSIBILITY_KEYS.includes(value as ProjectResponsibilityKey)
    ? value as ProjectResponsibilityKey
    : 'observer'
}

function normalizeScopeType(value?: string | null): ProjectScopeType {
  return PROJECT_SCOPE_TYPES.includes(value as ProjectScopeType)
    ? value as ProjectScopeType
    : 'project'
}

function normalizeScopeSource(value?: string | null): ProjectScopeSource {
  return PROJECT_SCOPE_SOURCES.includes(value as ProjectScopeSource)
    ? value as ProjectScopeSource
    : 'project'
}

function normalizeAssignmentStatus(value?: string | null) {
  return PROJECT_SCOPE_ASSIGNMENT_STATUSES.includes(value as typeof PROJECT_SCOPE_ASSIGNMENT_STATUSES[number])
    ? value as typeof PROJECT_SCOPE_ASSIGNMENT_STATUSES[number]
    : 'active'
}

function mapTeamRoleToParticipantRole(role?: string): ProjectParticipantRoleKey {
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

function phaseStatusLabel(status?: string) {
  switch (status) {
    case 'planned': return 'Запланирована'
    case 'active': return 'В работе'
    case 'blocked': return 'Заблокирована'
    case 'done': return 'Завершена'
    default: return status || 'Без статуса'
  }
}

function sprintStatusLabel(status?: string) {
  switch (status) {
    case 'planned': return 'Запланирован'
    case 'active': return 'Активен'
    case 'review': return 'На ревью'
    case 'done': return 'Завершён'
    default: return status || 'Без статуса'
  }
}

function hybridTaskStatusLabel(status?: string) {
  switch (status) {
    case 'todo': return 'К запуску'
    case 'doing': return 'В работе'
    case 'review': return 'На ревью'
    case 'done': return 'Готово'
    default: return status || 'Без статуса'
  }
}

function workTaskStatusLabel(status?: string) {
  switch (status) {
    case 'planned': return 'Запланировано'
    case 'pending': return 'Ожидание'
    case 'in_progress': return 'В работе'
    case 'paused': return 'На паузе'
    case 'done': return 'Выполнено'
    case 'cancelled': return 'Отменено'
    case 'skipped': return 'Пропущено'
    default: return status || 'Без статуса'
  }
}

function formatDateRange(startDate?: string | null, endDate?: string | null) {
  if (startDate && endDate) {
    return `${startDate} - ${endDate}`
  }

  return startDate || endDate || 'период не задан'
}

function legacyActiveTaskCount(control: HybridControl, displayName: string) {
  const normalizedName = displayName.trim().toLowerCase()
  if (!normalizedName) {
    return 0
  }

  return control.sprints
    .flatMap(sprint => sprint.tasks)
    .filter(task => (task.assignee || '').trim().toLowerCase() === normalizedName && task.status !== 'done')
    .length
}

function isGovernanceTableMissing(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return /project_participants|project_scope_assignments|project_scope_settings/i.test(message)
    && /does not exist|relation .* does not exist|no such table/i.test(message)
}

async function safeGovernanceQuery<T>(loader: () => Promise<T>, fallback: T) {
  try {
    return await loader()
  } catch (error) {
    if (isGovernanceTableMissing(error)) {
      return fallback
    }

    throw error
  }
}

function buildParticipantSecondary(parts: Array<string | null | undefined>) {
  return joinParts(parts)
}

function derivedParticipantKey(participant: { sourceKind: ProjectParticipantSourceKind; sourceId?: number; persistedId?: number; roleKey: ProjectParticipantRoleKey; displayName: string }) {
  if (participant.sourceId) {
    return `source:${participant.sourceKind}:${participant.sourceId}`
  }

  if (participant.persistedId) {
    return `participant:${participant.persistedId}`
  }

  return `custom:${participant.roleKey}:${participant.displayName.trim().toLowerCase()}`
}

function sortParticipants(left: ProjectGovernanceSummaryParticipant, right: ProjectGovernanceSummaryParticipant) {
  if (left.isPrimary !== right.isPrimary) {
    return Number(right.isPrimary) - Number(left.isPrimary)
  }

  if (left.roleKey !== right.roleKey) {
    return getProjectParticipantRoleLabel(left.roleKey).localeCompare(getProjectParticipantRoleLabel(right.roleKey), 'ru')
  }

  return left.displayName.localeCompare(right.displayName, 'ru')
}

async function readPersistedGovernanceState(projectId: number) {
  const db = useDb()

  const [participantRows, assignmentRows, settingsRows] = await Promise.all([
    safeGovernanceQuery(() => db
      .select({
        id: projectParticipants.id,
        projectId: projectParticipants.projectId,
        sourceKind: projectParticipants.sourceKind,
        sourceId: projectParticipants.sourceId,
        roleKey: projectParticipants.roleKey,
        displayName: projectParticipants.displayName,
        companyName: projectParticipants.companyName,
        phone: projectParticipants.phone,
        email: projectParticipants.email,
        messengerNick: projectParticipants.messengerNick,
        isPrimary: projectParticipants.isPrimary,
        status: projectParticipants.status,
        notes: projectParticipants.notes,
        meta: projectParticipants.meta,
      })
      .from(projectParticipants)
      .where(eq(projectParticipants.projectId, projectId))
      .orderBy(asc(projectParticipants.displayName)), []),
    safeGovernanceQuery(() => db
      .select({
        id: projectScopeAssignments.id,
        participantId: projectScopeAssignments.participantId,
        scopeType: projectScopeAssignments.scopeType,
        scopeSource: projectScopeAssignments.scopeSource,
        scopeId: projectScopeAssignments.scopeId,
        responsibility: projectScopeAssignments.responsibility,
        status: projectScopeAssignments.status,
        dueDate: projectScopeAssignments.dueDate,
        notes: projectScopeAssignments.notes,
        assignedAt: projectScopeAssignments.assignedAt,
        updatedAt: projectScopeAssignments.updatedAt,
      })
      .from(projectScopeAssignments)
      .where(eq(projectScopeAssignments.projectId, projectId)), []),
    safeGovernanceQuery(() => db
      .select({
        id: projectScopeSettings.id,
        scopeType: projectScopeSettings.scopeType,
        scopeSource: projectScopeSettings.scopeSource,
        scopeId: projectScopeSettings.scopeId,
        settings: projectScopeSettings.settings,
        updatedAt: projectScopeSettings.updatedAt,
      })
      .from(projectScopeSettings)
      .where(eq(projectScopeSettings.projectId, projectId)), []),
  ])

  return { participantRows, assignmentRows, settingsRows }
}

function buildDerivedParticipants(project: ProjectGovernanceProjectRow, control: HybridControl, relations: ProjectRelationsSnapshot | null): ProjectGovernanceSummaryParticipant[] {
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

function mergeParticipants(
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

function mapParticipantSourceToCatalogKind(sourceKind: ProjectParticipantSourceKind): 'client' | 'contractor' | 'designer' | 'seller' | 'manager' | 'custom' {
  if (sourceKind === 'client' || sourceKind === 'contractor' || sourceKind === 'designer' || sourceKind === 'seller' || sourceKind === 'manager') {
    return sourceKind
  }

  return 'custom'
}

function getScopeCounts(control: HybridControl) {
  return {
    project: 1,
    phase: control.phases.length,
    sprint: control.sprints.length,
    task: control.sprints.reduce((total, sprint) => total + sprint.tasks.length, 0),
    document: 0,
    service: 0,
  }
}

async function getGovernanceState(projectInput: ProjectGovernanceProjectRow, options: GovernanceSummaryOptions = {}): Promise<GovernanceState> {
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

function findScopeSettings(state: GovernanceState, scopeType: ProjectScopeType, scopeSource: ProjectScopeSource, scopeId: string) {
  return state.settingsRows.find(row => normalizeScopeType(row.scopeType) === scopeType
    && normalizeScopeSource(row.scopeSource) === scopeSource
    && row.scopeId === scopeId)
}

function buildRuleItems(state: GovernanceState, subtitle: string): ProjectScopeRuleSummary[] {
  return state.coordination.playbook.slice(0, 4).map(rule => ({
    id: rule.id,
    title: rule.title,
    channel: rule.linkedChannelLabel || getHybridCommunicationChannelLabel(rule.linkedChannel),
    trigger: rule.trigger,
    audience: rule.audienceLabels.length ? rule.audienceLabels.join(' · ') : subtitle,
  }))
}

function createTaskSummary(id: string, title: string, status: string, statusLabel: string, assigneeLabels: string[], secondary = ''): ProjectScopeTaskSummary {
  return {
    id,
    title,
    status,
    statusLabel,
    assigneeLabels,
    secondary,
  }
}

function createFallbackParticipantSummary(
  state: GovernanceState,
  entry: { displayName: string; roleKey?: ProjectParticipantRoleKey; responsibility: ProjectResponsibilityKey; secondary?: string },
): ProjectScopeParticipantSummary | null {
  const normalizedName = entry.displayName.trim()
  if (!normalizedName) {
    return null
  }

  const matched = state.participants.find(participant => participant.displayName.trim().toLowerCase() === normalizedName.toLowerCase())
  const roleKey = matched?.roleKey || entry.roleKey || 'other'
  const origin: ProjectScopeAssignmentOrigin = 'derived'

  return {
    assignmentId: `derived:${normalizedName}:${entry.responsibility}`,
    participantId: matched?.id || `derived:${normalizedName}`,
    displayName: matched?.displayName || normalizedName,
    roleKey,
    roleLabel: getProjectParticipantRoleLabel(roleKey),
    responsibility: entry.responsibility,
    responsibilityLabel: getProjectResponsibilityLabel(entry.responsibility),
    origin,
    activeTaskCount: matched?.activeTaskCount || legacyActiveTaskCount(state.control, normalizedName),
    secondary: entry.secondary || matched?.secondary || '',
  }
}

function participantSummarySort(left: ProjectScopeParticipantSummary, right: ProjectScopeParticipantSummary) {
  const responsibilityOrder: ProjectResponsibilityKey[] = ['lead', 'owner', 'executor', 'reviewer', 'approver', 'consultant', 'observer']
  const leftIndex = responsibilityOrder.indexOf(left.responsibility)
  const rightIndex = responsibilityOrder.indexOf(right.responsibility)
  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex
  }

  if (left.origin !== right.origin) {
    return ['direct', 'project', 'derived'].indexOf(left.origin) - ['direct', 'project', 'derived'].indexOf(right.origin)
  }

  return left.displayName.localeCompare(right.displayName, 'ru')
}

function buildScopeParticipantSummaries(
  state: GovernanceState,
  scopeType: ProjectScopeType,
  scopeSource: ProjectScopeSource,
  scopeId: string,
  fallbackParticipants: ResolvedScopeContext['legacyParticipants'],
) {
  const directAssignments = state.assignmentRows.filter(row => normalizeAssignmentStatus(row.status) !== 'removed'
    && normalizeScopeType(row.scopeType) === scopeType
    && normalizeScopeSource(row.scopeSource) === scopeSource
    && row.scopeId === scopeId)

  const projectAssignments = state.assignmentRows.filter(row => normalizeAssignmentStatus(row.status) !== 'removed'
    && normalizeScopeType(row.scopeType) === 'project'
    && normalizeScopeSource(row.scopeSource) === 'project'
    && row.scopeId === state.project.slug)

  const summaries: ProjectScopeParticipantSummary[] = []
  const seen = new Set<string>()

  const appendAssignment = (row: GovernanceState['assignmentRows'][number], origin: ProjectScopeAssignmentOrigin) => {
    const participant = state.participantByPersistedId.get(row.participantId)
    if (!participant) {
      return
    }

    const responsibility = normalizeResponsibility(row.responsibility)
    const key = `${participant.id}:${responsibility}:${origin}`
    if (seen.has(key)) {
      return
    }

    seen.add(key)
    summaries.push({
      assignmentId: `assignment:${row.id}`,
      participantId: participant.id,
      displayName: participant.displayName,
      roleKey: participant.roleKey,
      roleLabel: getProjectParticipantRoleLabel(participant.roleKey),
      responsibility,
      responsibilityLabel: getProjectResponsibilityLabel(responsibility),
      origin,
      activeTaskCount: participant.activeTaskCount,
      secondary: participant.secondary,
    })
  }

  directAssignments.forEach(row => appendAssignment(row, 'direct'))
  projectAssignments.forEach(row => appendAssignment(row, 'project'))

  if (!summaries.length) {
    fallbackParticipants.forEach((entry) => {
      const summary = createFallbackParticipantSummary(state, entry)
      if (!summary) {
        return
      }

      const key = `${summary.participantId}:${summary.responsibility}:${summary.origin}`
      if (seen.has(key)) {
        return
      }

      seen.add(key)
      summaries.push(summary)
    })

    const shouldAppendDerivedProjectParticipants = state.assignmentRows.length === 0 && state.participantByPersistedId.size === 0
    if (shouldAppendDerivedProjectParticipants) {
      state.participants.forEach((participant) => {
        const key = `${participant.id}:observer:derived`
        if (seen.has(key)) {
          return
        }

        seen.add(key)
        summaries.push({
          assignmentId: `derived:${participant.id}:observer`,
          participantId: participant.id,
          displayName: participant.displayName,
          roleKey: participant.roleKey,
          roleLabel: getProjectParticipantRoleLabel(participant.roleKey),
          responsibility: 'observer',
          responsibilityLabel: getProjectResponsibilityLabel('observer'),
          origin: 'derived',
          activeTaskCount: participant.activeTaskCount,
          secondary: participant.secondary,
        })
      })
    }
  }

  return summaries.sort(participantSummarySort)
}

function buildSubjectItems(participants: ProjectScopeParticipantSummary[]) {
  return participants.map((participant) => ({
    key: `subject:${participant.assignmentId}`,
    label: `${participant.roleLabel} · ${participant.responsibilityLabel}`,
    value: joinParts([participant.displayName, participant.secondary]),
  }))
}

function findPhase(control: HybridControl, scopeId: string) {
  return control.phases.find(phase => phase.id === scopeId || phase.phaseKey === scopeId) || null
}

function findSprint(control: HybridControl, scopeId: string) {
  return control.sprints.find(sprint => sprint.id === scopeId) || null
}

function findHybridTask(control: HybridControl, scopeId: string) {
  const normalizedId = scopeId.startsWith('hybrid:') ? scopeId.slice('hybrid:'.length) : scopeId

  for (const sprint of control.sprints) {
    const task = sprint.tasks.find(item => item.id === normalizedId)
    if (task) {
      return { sprint, task }
    }
  }

  return null
}

function buildPhaseScopeContext(state: GovernanceState, phase: HybridControlPhase): ResolvedScopeContext {
  const linkedSprints = state.control.sprints.filter(sprint => sprint.linkedPhaseKey === phase.phaseKey)
  const linkedTasks = linkedSprints.flatMap(sprint => sprint.tasks.map(task => ({ sprint, task })))
  const taskSummaries = linkedTasks.map(({ sprint, task }) => createTaskSummary(
    `hybrid:${task.id}`,
    task.title,
    task.status,
    hybridTaskStatusLabel(task.status),
    task.assignee ? [task.assignee] : [],
    joinParts([sprint.name, formatDateRange(sprint.startDate, sprint.endDate)]),
  ))

  return {
    scopeType: 'phase',
    scopeSource: 'hybrid-control',
    scopeId: phase.id,
    title: phase.title,
    subtitle: joinParts([phaseStatusLabel(phase.status), formatDateRange(phase.startDate, phase.endDate)]),
    status: phase.status,
    statusLabel: phaseStatusLabel(phase.status),
    core: {
      phaseKey: phase.phaseKey,
      percent: phase.percent,
      owner: phase.owner || '',
      deliverable: phase.deliverable || '',
      notes: phase.notes || '',
      startDate: phase.startDate || '',
      endDate: phase.endDate || '',
    },
    objectItems: [
      { key: 'deliverable', label: 'Результат', value: phase.deliverable || 'результат не зафиксирован' },
      { key: 'linked-sprints', label: 'Связанные спринты', value: linkedSprints.length ? linkedSprints.map(sprint => sprint.name).join(' · ') : 'спринты ещё не привязаны' },
      { key: 'task-count', label: 'Задачи контура', value: linkedTasks.length ? `${linkedTasks.length} задач в связанных спринтах` : 'задачи ещё не заведены' },
    ],
    actionItems: [
      ...(phase.gates || []).map(gate => ({
        key: `gate:${gate.id}`,
        label: gate.label,
        value: gate.done ? 'готово' : 'ожидает закрытия',
      })),
      ...state.control.checkpoints.slice(0, 2).map(checkpoint => ({
        key: `checkpoint:${checkpoint.id}`,
        label: checkpoint.title,
        value: checkpoint.note || checkpoint.status,
      })),
    ].slice(0, 8),
    linkedScopes: linkedSprints.map(sprint => ({
      scopeType: 'sprint',
      scopeSource: 'hybrid-control',
      scopeId: sprint.id,
      title: sprint.name,
      status: sprint.status,
      statusLabel: sprintStatusLabel(sprint.status),
    })),
    tasks: taskSummaries,
    legacyParticipants: [
      ...(phase.owner ? [{ displayName: phase.owner, responsibility: 'owner' as const, secondary: 'legacy поле phase.owner' }] : []),
      ...Array.from(new Set(linkedTasks.map(({ task }) => (task.assignee || '').trim()).filter(Boolean))).map(name => ({
        displayName: name,
        responsibility: 'executor' as const,
        secondary: 'исполнитель из задач спринта',
      })),
    ],
  }
}

function buildSprintScopeContext(state: GovernanceState, sprint: HybridControlSprint): ResolvedScopeContext {
  const linkedPhase = sprint.linkedPhaseKey ? state.control.phases.find(phase => phase.phaseKey === sprint.linkedPhaseKey) : null
  const taskSummaries = sprint.tasks.map(task => createTaskSummary(
    `hybrid:${task.id}`,
    task.title,
    task.status,
    hybridTaskStatusLabel(task.status),
    task.assignee ? [task.assignee] : [],
    joinParts([linkedPhase?.title, formatDateRange(task.dueDate, undefined)]),
  ))

  return {
    scopeType: 'sprint',
    scopeSource: 'hybrid-control',
    scopeId: sprint.id,
    title: sprint.name,
    subtitle: joinParts([linkedPhase?.title, formatDateRange(sprint.startDate, sprint.endDate)]),
    status: sprint.status,
    statusLabel: sprintStatusLabel(sprint.status),
    core: {
      linkedPhaseKey: sprint.linkedPhaseKey || '',
      linkedPhaseTitle: linkedPhase?.title || '',
      goal: sprint.goal || '',
      focus: sprint.focus || '',
      retrospective: sprint.retrospective || '',
      startDate: sprint.startDate || '',
      endDate: sprint.endDate || '',
    },
    objectItems: [
      { key: 'phase', label: 'Фаза', value: linkedPhase?.title || 'без фазы' },
      { key: 'goal', label: 'Цель', value: sprint.goal || 'цель не описана' },
      { key: 'focus', label: 'Фокус', value: sprint.focus || 'фокус команды не задан' },
      { key: 'retrospective', label: 'Ретроспектива', value: sprint.retrospective || 'ретроспектива ещё не добавлена' },
    ],
    actionItems: [
      ...sprint.tasks.map(task => ({
        key: `task:${task.id}`,
        label: task.title,
        value: `${hybridTaskStatusLabel(task.status)}${task.assignee ? ` · ${task.assignee}` : ''}`,
      })),
      ...state.control.blockers.slice(0, 2).map((blocker, index) => ({
        key: `blocker:${index + 1}`,
        label: `Блокер ${index + 1}`,
        value: blocker,
      })),
    ].slice(0, 8),
    linkedScopes: linkedPhase
      ? [{
          scopeType: 'phase',
          scopeSource: 'hybrid-control',
          scopeId: linkedPhase.id,
          title: linkedPhase.title,
          status: linkedPhase.status,
          statusLabel: phaseStatusLabel(linkedPhase.status),
        }]
      : [],
    tasks: taskSummaries,
    legacyParticipants: [
      ...(linkedPhase?.owner ? [{ displayName: linkedPhase.owner, responsibility: 'owner' as const, secondary: 'владелец связанной фазы' }] : []),
      ...Array.from(new Set(sprint.tasks.map(task => (task.assignee || '').trim()).filter(Boolean))).map(name => ({
        displayName: name,
        responsibility: 'executor' as const,
        secondary: 'исполнитель задачи спринта',
      })),
    ],
  }
}

async function buildTaskScopeContext(state: GovernanceState, scopeId: string): Promise<ResolvedScopeContext | null> {
  const hybridTaskContext = findHybridTask(state.control, scopeId)
  if (hybridTaskContext) {
    const linkedPhase = hybridTaskContext.sprint.linkedPhaseKey
      ? state.control.phases.find(phase => phase.phaseKey === hybridTaskContext.sprint.linkedPhaseKey)
      : null

    return {
      scopeType: 'task',
      scopeSource: 'hybrid-control',
      scopeId: `hybrid:${hybridTaskContext.task.id}`,
      title: hybridTaskContext.task.title,
      subtitle: joinParts([hybridTaskContext.sprint.name, linkedPhase?.title]),
      status: hybridTaskContext.task.status,
      statusLabel: hybridTaskStatusLabel(hybridTaskContext.task.status),
      core: {
        sprintId: hybridTaskContext.sprint.id,
        sprintName: hybridTaskContext.sprint.name,
        phaseTitle: linkedPhase?.title || '',
        assignee: hybridTaskContext.task.assignee || '',
        dueDate: hybridTaskContext.task.dueDate || '',
        notes: hybridTaskContext.task.notes || '',
      },
      objectItems: [
        { key: 'sprint', label: 'Спринт', value: hybridTaskContext.sprint.name },
        { key: 'phase', label: 'Фаза', value: linkedPhase?.title || 'без фазы' },
        { key: 'notes', label: 'Заметки', value: hybridTaskContext.task.notes || 'комментарий пока не добавлен' },
      ],
      actionItems: [
        { key: 'status', label: 'Статус', value: hybridTaskStatusLabel(hybridTaskContext.task.status) },
        { key: 'dueDate', label: 'Дедлайн', value: hybridTaskContext.task.dueDate || 'не назначен' },
      ],
      linkedScopes: [
        {
          scopeType: 'sprint',
          scopeSource: 'hybrid-control',
          scopeId: hybridTaskContext.sprint.id,
          title: hybridTaskContext.sprint.name,
          status: hybridTaskContext.sprint.status,
          statusLabel: sprintStatusLabel(hybridTaskContext.sprint.status),
        },
        ...(linkedPhase ? [{
          scopeType: 'phase' as const,
          scopeSource: 'hybrid-control' as const,
          scopeId: linkedPhase.id,
          title: linkedPhase.title,
          status: linkedPhase.status,
          statusLabel: phaseStatusLabel(linkedPhase.status),
        }] : []),
      ],
      tasks: [createTaskSummary(
        `hybrid:${hybridTaskContext.task.id}`,
        hybridTaskContext.task.title,
        hybridTaskContext.task.status,
        hybridTaskStatusLabel(hybridTaskContext.task.status),
        hybridTaskContext.task.assignee ? [hybridTaskContext.task.assignee] : [],
        hybridTaskContext.task.notes || '',
      )],
      legacyParticipants: [
        ...(linkedPhase?.owner ? [{ displayName: linkedPhase.owner, responsibility: 'owner' as const, secondary: 'владелец фазы' }] : []),
        ...(hybridTaskContext.task.assignee ? [{ displayName: hybridTaskContext.task.assignee, responsibility: 'executor' as const, secondary: 'исполнитель задачи' }] : []),
      ],
    }
  }

  const db = useDb()
  const numericId = Number(scopeId.replace(/^work:/, '').trim())
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null
  }

  const [workTask] = await db
    .select({
      id: workStatusItems.id,
      title: workStatusItems.title,
      status: workStatusItems.status,
      workType: workStatusItems.workType,
      notes: workStatusItems.notes,
      dateStart: workStatusItems.dateStart,
      dateEnd: workStatusItems.dateEnd,
      contractorName: contractors.name,
    })
    .from(workStatusItems)
    .leftJoin(contractors, eq(workStatusItems.contractorId, contractors.id))
    .where(and(eq(workStatusItems.projectId, state.project.id), eq(workStatusItems.id, numericId)))
    .limit(1)

  if (!workTask) {
    return null
  }

  return {
    scopeType: 'task',
    scopeSource: 'work-status',
    scopeId: `work:${workTask.id}`,
    title: workTask.title,
    subtitle: joinParts([workTask.workType, formatDateRange(workTask.dateStart, workTask.dateEnd)]),
    status: workTask.status,
    statusLabel: workTaskStatusLabel(workTask.status),
    core: {
      workType: workTask.workType || '',
      notes: workTask.notes || '',
      assignee: workTask.contractorName || '',
      rangeStart: workTask.dateStart || '',
      rangeEnd: workTask.dateEnd || '',
    },
    objectItems: [
      { key: 'workType', label: 'Вид работ', value: workTask.workType || 'не указан' },
      { key: 'period', label: 'Период', value: formatDateRange(workTask.dateStart, workTask.dateEnd) },
      { key: 'notes', label: 'Заметки', value: workTask.notes || 'без комментария' },
    ],
    actionItems: [
      { key: 'status', label: 'Статус', value: workTaskStatusLabel(workTask.status) },
      { key: 'contractor', label: 'Исполнитель', value: workTask.contractorName || 'не назначен' },
    ],
    linkedScopes: [],
    tasks: [createTaskSummary(
      `work:${workTask.id}`,
      workTask.title,
      workTask.status,
      workTaskStatusLabel(workTask.status),
      workTask.contractorName ? [workTask.contractorName] : [],
      workTask.workType || '',
    )],
    legacyParticipants: workTask.contractorName
      ? [{ displayName: workTask.contractorName, responsibility: 'executor', secondary: 'исполнитель статуса работ' }]
      : [],
  }
}

async function buildDocumentScopeContext(state: GovernanceState, scopeId: string): Promise<ResolvedScopeContext | null> {
  const numericId = Number(scopeId.replace(/^document:/, '').trim())
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null
  }

  const db = useDb()
  const [document] = await db
    .select({
      id: documents.id,
      title: documents.title,
      category: documents.category,
      filename: documents.filename,
      notes: documents.notes,
      templateKey: documents.templateKey,
    })
    .from(documents)
    .where(and(eq(documents.projectId, state.project.id), eq(documents.id, numericId)))
    .limit(1)

  if (!document) {
    return null
  }

  return {
    scopeType: 'document',
    scopeSource: 'documents',
    scopeId: `document:${document.id}`,
    title: document.title,
    subtitle: joinParts([document.category, document.filename || document.templateKey]),
    status: document.category,
    statusLabel: document.category || 'Документ',
    core: {
      category: document.category,
      filename: document.filename || '',
      templateKey: document.templateKey || '',
      notes: document.notes || '',
    },
    objectItems: [
      { key: 'category', label: 'Категория', value: document.category || 'other' },
      { key: 'filename', label: 'Файл', value: document.filename || 'не загружен' },
      { key: 'notes', label: 'Заметки', value: document.notes || 'без заметок' },
    ],
    actionItems: [
      { key: 'template', label: 'Шаблон', value: document.templateKey || 'без шаблона' },
    ],
    linkedScopes: [],
    tasks: [],
    legacyParticipants: [],
  }
}

async function buildServiceScopeContext(state: GovernanceState, scopeId: string): Promise<ResolvedScopeContext | null> {
  const numericId = Number(scopeId.replace(/^service:/, '').trim())
  if (!Number.isInteger(numericId) || numericId <= 0) {
    return null
  }

  const db = useDb()
  const [service] = await db
    .select({
      id: projectExtraServices.id,
      title: projectExtraServices.title,
      status: projectExtraServices.status,
      requestedBy: projectExtraServices.requestedBy,
      totalPrice: projectExtraServices.totalPrice,
      description: projectExtraServices.description,
    })
    .from(projectExtraServices)
    .where(and(eq(projectExtraServices.projectId, state.project.id), eq(projectExtraServices.id, numericId)))
    .limit(1)

  if (!service) {
    return null
  }

  return {
    scopeType: 'service',
    scopeSource: 'extra-services',
    scopeId: `service:${service.id}`,
    title: service.title,
    subtitle: joinParts([service.requestedBy, service.totalPrice ? `${service.totalPrice} ₽` : '']),
    status: service.status,
    statusLabel: service.status || 'Услуга',
    core: {
      requestedBy: service.requestedBy,
      totalPrice: service.totalPrice || 0,
      description: service.description || '',
    },
    objectItems: [
      { key: 'requestedBy', label: 'Запросил', value: service.requestedBy },
      { key: 'totalPrice', label: 'Стоимость', value: service.totalPrice ? `${service.totalPrice} ₽` : 'не рассчитана' },
      { key: 'description', label: 'Описание', value: service.description || 'описание не заполнено' },
    ],
    actionItems: [],
    linkedScopes: [],
    tasks: [],
    legacyParticipants: [],
  }
}

function buildProjectScopeContext(state: GovernanceState): ResolvedScopeContext {
  const activeTasks = state.control.sprints.flatMap(sprint => sprint.tasks)

  return {
    scopeType: 'project',
    scopeSource: 'project',
    scopeId: state.project.slug,
    title: state.project.title,
    subtitle: joinParts([state.project.status, state.project.projectType]),
    status: state.project.status,
    statusLabel: state.project.status || 'Проект',
    core: {
      projectType: state.project.projectType,
      status: state.project.status,
      activePhaseTitle: state.coordination.summary.activePhaseTitle,
      activeSprintTitle: state.coordination.summary.activeSprintTitle,
    },
    objectItems: [
      { key: 'phase-count', label: 'Фазы', value: `${state.control.phases.length}` },
      { key: 'sprint-count', label: 'Спринты', value: `${state.control.sprints.length}` },
      { key: 'task-count', label: 'Задачи', value: `${activeTasks.length}` },
    ],
    actionItems: state.control.blockers.slice(0, 4).map((blocker, index) => ({
      key: `blocker:${index + 1}`,
      label: `Блокер ${index + 1}`,
      value: blocker,
    })),
    linkedScopes: state.control.phases.map(phase => ({
      scopeType: 'phase',
      scopeSource: 'hybrid-control',
      scopeId: phase.id,
      title: phase.title,
      status: phase.status,
      statusLabel: phaseStatusLabel(phase.status),
    })),
    tasks: activeTasks.slice(0, 8).map(task => createTaskSummary(
      `hybrid:${task.id}`,
      task.title,
      task.status,
      hybridTaskStatusLabel(task.status),
      task.assignee ? [task.assignee] : [],
    )),
    legacyParticipants: [],
  }
}

async function resolveScopeContext(state: GovernanceState, scopeType: ProjectScopeType, scopeId: string): Promise<ResolvedScopeContext | null> {
  switch (scopeType) {
    case 'project':
      return buildProjectScopeContext(state)
    case 'phase': {
      const phase = findPhase(state.control, scopeId)
      return phase ? buildPhaseScopeContext(state, phase) : null
    }
    case 'sprint': {
      const sprint = findSprint(state.control, scopeId)
      return sprint ? buildSprintScopeContext(state, sprint) : null
    }
    case 'task':
      return await buildTaskScopeContext(state, scopeId)
    case 'document':
      return await buildDocumentScopeContext(state, scopeId)
    case 'service':
      return await buildServiceScopeContext(state, scopeId)
    default:
      return null
  }
}

export async function getProjectGovernanceProject(projectSlug: string): Promise<ProjectGovernanceProjectRow | null> {
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      pages: projects.pages,
      profile: projects.profile,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, projectSlug))
    .limit(1)

  return normalizeProjectRow(project)
}

export async function buildProjectGovernanceSummary(project: ProjectGovernanceProjectRow, options: GovernanceSummaryOptions = {}): Promise<ProjectGovernanceSummary> {
  const state = await getGovernanceState(project, options)

  return {
    revision: state.revision,
    participants: state.participants,
    scopeCounters: getScopeCounts(state.control),
  }
}

export function buildProjectGovernanceCatalogSubjects(summary: ProjectGovernanceSummary) {
  return summary.participants.map(participant => ({
    id: participant.id,
    kind: mapParticipantSourceToCatalogKind(participant.sourceKind),
    label: participant.displayName,
    secondary: participant.secondary || joinParts([
      getProjectParticipantRoleLabel(participant.roleKey),
      participant.assignmentCount ? `${participant.assignmentCount} назначений` : '',
      participant.activeTaskCount ? `${participant.activeTaskCount} активных задач` : '',
    ]),
  }))
}

export async function buildProjectScopeDetail(project: ProjectGovernanceProjectRow, scopeType: ProjectScopeType, scopeId: string, options: GovernanceSummaryOptions = {}): Promise<ProjectScopeDetailBundle | null> {
  const state = await getGovernanceState(project, options)
  const context = await resolveScopeContext(state, scopeType, scopeId)

  if (!context) {
    return null
  }

  const scopeSettingsRow = findScopeSettings(state, context.scopeType, context.scopeSource, context.scopeId)
  const normalizedSettings = {
    ...buildDefaultProjectScopeSettings(context.scopeType),
    ...(scopeSettingsRow?.settings || {}),
  } as Record<string, string | number | boolean | null>
  const participants = buildScopeParticipantSummaries(state, context.scopeType, context.scopeSource, context.scopeId, context.legacyParticipants)

  return {
    revision: state.revision,
    scope: {
      scopeType: context.scopeType,
      scopeSource: context.scopeSource,
      scopeId: context.scopeId,
      title: context.title,
      subtitle: context.subtitle,
      status: context.status,
      statusLabel: context.statusLabel,
    },
    core: context.core,
    settings: normalizedSettings,
    settingItems: buildProjectScopeSettingEntries(context.scopeType, normalizedSettings),
    participants,
    subjectItems: buildSubjectItems(participants),
    objectItems: context.objectItems,
    actionItems: context.actionItems,
    ruleItems: buildRuleItems(state, context.subtitle || context.title),
    linkedScopes: context.linkedScopes,
    tasks: context.tasks,
  }
}

function sanitizeGovernanceJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => sanitizeGovernanceJsonValue(item))
  }

  if (!isRecord(value)) {
    return value
  }

  const clean: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (DANGEROUS_JSON_KEYS.has(key)) {
      continue
    }

    clean[key] = sanitizeGovernanceJsonValue(entry)
  }

  return clean
}

function sanitizeGovernanceRecord(value?: Record<string, unknown> | null): Record<string, string | number | boolean | null> {
  const sanitized = sanitizeGovernanceJsonValue(isRecord(value) ? value : {})
  return (isRecord(sanitized) ? sanitized : {}) as Record<string, string | number | boolean | null>
}

function toNullableTrimmedString(value?: string | null) {
  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized || null
}

function normalizeIsoDate(value: Date | string | null | undefined) {
  if (value instanceof Date) {
    return value.toISOString()
  }

  if (typeof value === 'string' && value.trim()) {
    return value
  }

  return new Date().toISOString()
}

function isUniqueViolation(error: unknown, constraintName?: string) {
  const record = error as { code?: string; cause?: { code?: string; constraint?: string }; constraint?: string }
  const code = record?.cause?.code || record?.code
  const constraint = record?.cause?.constraint || record?.constraint

  return code === '23505' && (!constraintName || constraint === constraintName)
}

function assertGovernanceParticipantSource(sourceKind: ProjectParticipantSourceKind, sourceId?: number) {
  if (sourceKind === 'custom' && sourceId) {
    throw createError({ statusCode: 400, statusMessage: 'Для custom participant sourceId не нужен' })
  }

  if (sourceKind !== 'custom' && !sourceId) {
    throw createError({ statusCode: 400, statusMessage: 'Для связанного участника нужен sourceId' })
  }
}

function assignmentLifecyclePriority(status?: string) {
  switch (normalizeAssignmentStatus(status)) {
    case 'active': return 0
    case 'pending': return 1
    case 'done': return 2
    case 'removed': return 3
    default: return 4
  }
}

function phaseResponsibilityPriority(responsibility: ProjectResponsibilityKey) {
  switch (responsibility) {
    case 'owner': return 0
    case 'lead': return 1
    case 'executor': return 2
    case 'reviewer': return 3
    case 'approver': return 4
    case 'consultant': return 5
    case 'observer': return 6
    default: return 7
  }
}

function taskResponsibilityPriority(responsibility: ProjectResponsibilityKey) {
  switch (responsibility) {
    case 'executor': return 0
    case 'owner': return 1
    case 'lead': return 2
    case 'reviewer': return 3
    case 'approver': return 4
    case 'consultant': return 5
    case 'observer': return 6
    default: return 7
  }
}

function toSortableTime(value: Date | string | null | undefined) {
  const time = new Date(value || 0).getTime()
  return Number.isFinite(time) ? time : 0
}

function pickLegacyParticipantName(
  rows: Array<{
    id: number
    participantId: number
    responsibility: string
    status: string
    assignedAt: Date | string
  }>,
  participantNames: Map<number, string>,
  getResponsibilityPriority: (responsibility: ProjectResponsibilityKey) => number,
) {
  return rows
    .filter(row => normalizeAssignmentStatus(row.status) !== 'removed')
    .sort((left, right) => {
      const lifecycleDiff = assignmentLifecyclePriority(left.status) - assignmentLifecyclePriority(right.status)
      if (lifecycleDiff !== 0) {
        return lifecycleDiff
      }

      const responsibilityDiff = getResponsibilityPriority(normalizeResponsibility(left.responsibility)) - getResponsibilityPriority(normalizeResponsibility(right.responsibility))
      if (responsibilityDiff !== 0) {
        return responsibilityDiff
      }

      const assignedAtDiff = toSortableTime(left.assignedAt) - toSortableTime(right.assignedAt)
      if (assignedAtDiff !== 0) {
        return assignedAtDiff
      }

      return left.id - right.id
    })
    .map(row => participantNames.get(row.participantId)?.trim() || '')
    .find(Boolean) || ''
}

function mapParticipantRowToContract(row: Record<string, any>): ProjectParticipant {
  return {
    id: `participant:${row.id}`,
    persistedId: Number(row.id),
    projectId: Number(row.projectId),
    sourceKind: normalizeSourceKind(row.sourceKind),
    sourceId: typeof row.sourceId === 'number' ? row.sourceId : undefined,
    roleKey: normalizeRoleKey(row.roleKey),
    displayName: String(row.displayName || '').trim(),
    companyName: row.companyName || undefined,
    phone: row.phone || undefined,
    email: row.email || undefined,
    messengerNick: row.messengerNick || undefined,
    isPrimary: Boolean(row.isPrimary),
    status: row.status === 'archived' ? 'archived' : 'active',
    notes: row.notes || undefined,
    meta: (isRecord(row.meta) ? row.meta : {}) as Record<string, string | number | boolean | null>,
  }
}

function mapAssignmentRowToContract(row: Record<string, any>): ProjectScopeAssignment {
  return {
    id: `assignment:${row.id}`,
    persistedId: Number(row.id),
    projectId: Number(row.projectId),
    participantId: `participant:${row.participantId}`,
    persistedParticipantId: Number(row.participantId),
    scopeType: normalizeScopeType(row.scopeType),
    scopeSource: normalizeScopeSource(row.scopeSource),
    scopeId: String(row.scopeId || '').trim(),
    responsibility: normalizeResponsibility(row.responsibility),
    allocationPercent: typeof row.allocationPercent === 'number' ? row.allocationPercent : undefined,
    status: normalizeAssignmentStatus(row.status),
    dueDate: row.dueDate || undefined,
    notes: row.notes || undefined,
    meta: (isRecord(row.meta) ? row.meta : {}) as Record<string, string | number | boolean | null>,
    assignedBy: row.assignedBy || undefined,
    assignedAt: normalizeIsoDate(row.assignedAt),
    updatedAt: normalizeIsoDate(row.updatedAt),
  }
}

function mapSettingsRowToContract(row: Record<string, any>): ProjectScopeSettings {
  return {
    id: `scope-settings:${row.id}`,
    persistedId: Number(row.id),
    projectId: Number(row.projectId),
    scopeType: normalizeScopeType(row.scopeType),
    scopeSource: normalizeScopeSource(row.scopeSource),
    scopeId: String(row.scopeId || '').trim(),
    settings: (isRecord(row.settings) ? row.settings : {}) as Record<string, string | number | boolean | null>,
    updatedAt: normalizeIsoDate(row.updatedAt),
  }
}

async function syncProjectGovernanceLegacySnapshotsTx(tx: any, project: ProjectGovernanceProjectRow) {
  const [participantRows, assignmentRows] = await Promise.all([
    tx
      .select({
        id: projectParticipants.id,
        displayName: projectParticipants.displayName,
      })
      .from(projectParticipants)
      .where(eq(projectParticipants.projectId, project.id)),
    tx
      .select({
        id: projectScopeAssignments.id,
        participantId: projectScopeAssignments.participantId,
        scopeType: projectScopeAssignments.scopeType,
        scopeSource: projectScopeAssignments.scopeSource,
        scopeId: projectScopeAssignments.scopeId,
        responsibility: projectScopeAssignments.responsibility,
        status: projectScopeAssignments.status,
        assignedAt: projectScopeAssignments.assignedAt,
      })
      .from(projectScopeAssignments)
      .where(eq(projectScopeAssignments.projectId, project.id))
      .orderBy(asc(projectScopeAssignments.assignedAt), asc(projectScopeAssignments.id)),
  ])

  const participantNames = new Map<number, string>(
    participantRows.map((row: { id: number; displayName: string }) => [row.id, String(row.displayName || '').trim()]),
  )

  const profile = toProfileRecord(project.profile)
  const currentControl = ensureHybridControl(profile.hybridControl, project)

  const nextControl = ensureHybridControl({
    ...currentControl,
    phases: currentControl.phases.map((phase) => {
      const scopeIds = new Set([phase.id, phase.phaseKey].filter(Boolean))
      const owner = pickLegacyParticipantName(
        assignmentRows.filter((row: { scopeType: string; scopeSource: string; scopeId: string }) => normalizeScopeType(row.scopeType) === 'phase'
          && normalizeScopeSource(row.scopeSource) === 'hybrid-control'
          && scopeIds.has(row.scopeId)),
        participantNames,
        phaseResponsibilityPriority,
      )

      return {
        ...phase,
        owner,
      }
    }),
    sprints: currentControl.sprints.map((sprint) => ({
      ...sprint,
      tasks: sprint.tasks.map((task) => {
        const scopeIds = new Set([task.id, `hybrid:${task.id}`].filter(Boolean))
        const assignee = pickLegacyParticipantName(
          assignmentRows.filter((row: { scopeType: string; scopeSource: string; scopeId: string }) => normalizeScopeType(row.scopeType) === 'task'
            && normalizeScopeSource(row.scopeSource) === 'hybrid-control'
            && scopeIds.has(row.scopeId)),
          participantNames,
          taskResponsibilityPriority,
        )

        return {
          ...task,
          assignee,
        }
      }),
    })),
  }, project)

  const revisionDate = new Date()
  await tx.update(projects)
    .set({
      profile: {
        ...profile,
        hybridControl: nextControl,
      } as any,
      updatedAt: revisionDate,
    })
    .where(eq(projects.id, project.id))

  return {
    control: nextControl,
    revision: revisionDate.toISOString(),
  }
}

async function resolveCanonicalScopeContextForMutation(
  state: GovernanceState,
  scopeType: ProjectScopeType,
  scopeSource: ProjectScopeSource,
  scopeId: string,
) {
  const lookupScopeId = scopeType === 'project' ? state.project.slug : scopeId
  const context = await resolveScopeContext(state, scopeType, lookupScopeId)
  if (!context) {
    return null
  }

  if (context.scopeSource !== (scopeType === 'project' ? 'project' : scopeSource)) {
    return null
  }

  return context
}

async function getProjectGovernanceProjectOrThrow(projectSlug: string) {
  const project = await getProjectGovernanceProject(projectSlug)
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  return project
}

export async function createProjectGovernanceParticipant(projectSlug: string, input: CreateProjectParticipant) {
  const project = await getProjectGovernanceProjectOrThrow(projectSlug)
  const sourceKind = input.sourceKind || 'custom'
  const sourceId = sourceKind === 'custom' ? undefined : input.sourceId
  assertGovernanceParticipantSource(sourceKind, sourceId)

  const db = useDb()
  try {
    return await db.transaction(async (tx) => {
      const [participantRow] = await tx.insert(projectParticipants)
        .values({
          projectId: project.id,
          sourceKind,
          sourceId: sourceId || null,
          roleKey: input.roleKey,
          displayName: input.displayName.trim(),
          companyName: toNullableTrimmedString(input.companyName),
          phone: toNullableTrimmedString(input.phone),
          email: toNullableTrimmedString(input.email),
          messengerNick: toNullableTrimmedString(input.messengerNick),
          isPrimary: Boolean(input.isPrimary),
          status: 'active',
          notes: toNullableTrimmedString(input.notes),
          meta: sanitizeGovernanceRecord(input.meta),
          updatedAt: new Date(),
        })
        .returning(projectParticipantReturning)

      const { revision } = await syncProjectGovernanceLegacySnapshotsTx(tx, project)

      return {
        participant: mapParticipantRowToContract(participantRow),
        revision,
      }
    })
  } catch (error) {
    if (isGovernanceTableMissing(error)) {
      throw createError({ statusCode: 500, statusMessage: 'Таблицы governance не готовы. Примените миграцию 0004_project_governance.sql' })
    }

    if (isUniqueViolation(error, 'project_participant_source_uniq')) {
      throw createError({ statusCode: 409, statusMessage: 'Такой участник уже добавлен в проект' })
    }

    throw error
  }
}

export async function updateProjectGovernanceParticipant(projectSlug: string, participantId: number, input: UpdateProjectParticipant) {
  const project = await getProjectGovernanceProjectOrThrow(projectSlug)
  const db = useDb()
  const [currentParticipant] = await db
    .select(projectParticipantReturning)
    .from(projectParticipants)
    .where(and(eq(projectParticipants.projectId, project.id), eq(projectParticipants.id, participantId)))
    .limit(1)

  if (!currentParticipant) {
    throw createError({ statusCode: 404, statusMessage: 'Участник проекта не найден' })
  }

  const nextSourceKind = input.sourceKind || normalizeSourceKind(currentParticipant.sourceKind)
  const nextSourceId = input.sourceKind === 'custom' && input.sourceId === undefined
    ? undefined
    : input.sourceId !== undefined
      ? input.sourceId || undefined
      : currentParticipant.sourceId || undefined

  assertGovernanceParticipantSource(nextSourceKind, nextSourceId)

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (input.sourceKind !== undefined) updates.sourceKind = nextSourceKind
  if (input.sourceId !== undefined || input.sourceKind === 'custom') updates.sourceId = nextSourceId || null
  if (input.roleKey !== undefined) updates.roleKey = input.roleKey
  if (input.displayName !== undefined) updates.displayName = input.displayName.trim()
  if (input.companyName !== undefined) updates.companyName = toNullableTrimmedString(input.companyName)
  if (input.phone !== undefined) updates.phone = toNullableTrimmedString(input.phone)
  if (input.email !== undefined) updates.email = toNullableTrimmedString(input.email)
  if (input.messengerNick !== undefined) updates.messengerNick = toNullableTrimmedString(input.messengerNick)
  if (input.isPrimary !== undefined) updates.isPrimary = input.isPrimary
  if (input.status !== undefined) updates.status = input.status
  if (input.notes !== undefined) updates.notes = toNullableTrimmedString(input.notes)
  if (input.meta !== undefined) updates.meta = sanitizeGovernanceRecord(input.meta)

  try {
    return await db.transaction(async (tx) => {
      const [participantRow] = await tx.update(projectParticipants)
        .set(updates)
        .where(and(eq(projectParticipants.projectId, project.id), eq(projectParticipants.id, participantId)))
        .returning(projectParticipantReturning)

      if (!participantRow) {
        throw createError({ statusCode: 404, statusMessage: 'Участник проекта не найден' })
      }

      const { revision } = await syncProjectGovernanceLegacySnapshotsTx(tx, project)

      return {
        participant: mapParticipantRowToContract(participantRow),
        revision,
      }
    })
  } catch (error) {
    if (isGovernanceTableMissing(error)) {
      throw createError({ statusCode: 500, statusMessage: 'Таблицы governance не готовы. Примените миграцию 0004_project_governance.sql' })
    }

    if (isUniqueViolation(error, 'project_participant_source_uniq')) {
      throw createError({ statusCode: 409, statusMessage: 'Такой участник уже добавлен в проект' })
    }

    throw error
  }
}

export async function createProjectGovernanceAssignment(projectSlug: string, input: CreateProjectScopeAssignment, options: { assignedBy?: string } = {}) {
  const project = await getProjectGovernanceProjectOrThrow(projectSlug)
  const state = await getGovernanceState(project)
  const participant = state.participantByPersistedId.get(input.participantId)
  if (!participant?.persistedId) {
    throw createError({ statusCode: 404, statusMessage: 'Участник проекта не найден' })
  }

  const context = await resolveCanonicalScopeContextForMutation(state, input.scopeType, input.scopeSource, input.scopeId)
  if (!context) {
    throw createError({ statusCode: 404, statusMessage: 'Контур проекта не найден' })
  }

  const db = useDb()
  try {
    return await db.transaction(async (tx) => {
      const [assignmentRow] = await tx.insert(projectScopeAssignments)
        .values({
          projectId: project.id,
          participantId: participant.persistedId,
          scopeType: context.scopeType,
          scopeSource: context.scopeSource,
          scopeId: context.scopeId,
          responsibility: input.responsibility,
          ...(input.allocationPercent != null ? { allocationPercent: input.allocationPercent } : {}),
          status: input.status || 'active',
          dueDate: toNullableTrimmedString(input.dueDate),
          notes: toNullableTrimmedString(input.notes),
          meta: sanitizeGovernanceRecord(input.meta),
          assignedBy: toNullableTrimmedString(input.assignedBy) || toNullableTrimmedString(options.assignedBy),
          assignedAt: new Date(),
          updatedAt: new Date(),
        })
        .returning(projectScopeAssignmentReturning)

      const { revision } = await syncProjectGovernanceLegacySnapshotsTx(tx, project)

      return {
        assignment: mapAssignmentRowToContract(assignmentRow),
        scope: {
          scopeType: context.scopeType,
          scopeSource: context.scopeSource,
          scopeId: context.scopeId,
        } satisfies CanonicalScopeRef,
        revision,
      }
    })
  } catch (error) {
    if (isGovernanceTableMissing(error)) {
      throw createError({ statusCode: 500, statusMessage: 'Таблицы governance не готовы. Примените миграцию 0004_project_governance.sql' })
    }

    if (isUniqueViolation(error, 'project_scope_assignment_uniq')) {
      throw createError({ statusCode: 409, statusMessage: 'Такое назначение уже существует' })
    }

    throw error
  }
}

export async function updateProjectGovernanceAssignment(projectSlug: string, assignmentId: number, input: UpdateProjectScopeAssignment) {
  const project = await getProjectGovernanceProjectOrThrow(projectSlug)
  const db = useDb()
  const [currentAssignment] = await db
    .select(projectScopeAssignmentReturning)
    .from(projectScopeAssignments)
    .where(and(eq(projectScopeAssignments.projectId, project.id), eq(projectScopeAssignments.id, assignmentId)))
    .limit(1)

  if (!currentAssignment) {
    throw createError({ statusCode: 404, statusMessage: 'Назначение не найдено' })
  }

  const state = await getGovernanceState(project)
  const nextParticipantId = input.participantId || currentAssignment.participantId
  const participant = state.participantByPersistedId.get(nextParticipantId)
  if (!participant?.persistedId) {
    throw createError({ statusCode: 404, statusMessage: 'Участник проекта не найден' })
  }

  const nextScopeType = input.scopeType || normalizeScopeType(currentAssignment.scopeType)
  const nextScopeSource = input.scopeSource || normalizeScopeSource(currentAssignment.scopeSource)
  const nextScopeId = input.scopeId || String(currentAssignment.scopeId || '').trim()

  const context = await resolveCanonicalScopeContextForMutation(state, nextScopeType, nextScopeSource, nextScopeId)
  if (!context) {
    throw createError({ statusCode: 404, statusMessage: 'Контур проекта не найден' })
  }

  const updates: Record<string, unknown> = {
    participantId: participant.persistedId,
    scopeType: context.scopeType,
    scopeSource: context.scopeSource,
    scopeId: context.scopeId,
    updatedAt: new Date(),
  }

  if (input.responsibility !== undefined) updates.responsibility = input.responsibility
  if (input.allocationPercent !== undefined) updates.allocationPercent = input.allocationPercent ?? null
  if (input.status !== undefined) updates.status = input.status
  if (input.dueDate !== undefined) updates.dueDate = toNullableTrimmedString(input.dueDate)
  if (input.notes !== undefined) updates.notes = toNullableTrimmedString(input.notes)
  if (input.meta !== undefined) updates.meta = sanitizeGovernanceRecord(input.meta)
  if (input.assignedBy !== undefined) updates.assignedBy = toNullableTrimmedString(input.assignedBy)

  try {
    return await db.transaction(async (tx) => {
      const [assignmentRow] = await tx.update(projectScopeAssignments)
        .set(updates)
        .where(and(eq(projectScopeAssignments.projectId, project.id), eq(projectScopeAssignments.id, assignmentId)))
        .returning(projectScopeAssignmentReturning)

      if (!assignmentRow) {
        throw createError({ statusCode: 404, statusMessage: 'Назначение не найдено' })
      }

      const { revision } = await syncProjectGovernanceLegacySnapshotsTx(tx, project)

      return {
        assignment: mapAssignmentRowToContract(assignmentRow),
        scope: {
          scopeType: context.scopeType,
          scopeSource: context.scopeSource,
          scopeId: context.scopeId,
        } satisfies CanonicalScopeRef,
        revision,
      }
    })
  } catch (error) {
    if (isGovernanceTableMissing(error)) {
      throw createError({ statusCode: 500, statusMessage: 'Таблицы governance не готовы. Примените миграцию 0004_project_governance.sql' })
    }

    if (isUniqueViolation(error, 'project_scope_assignment_uniq')) {
      throw createError({ statusCode: 409, statusMessage: 'Такое назначение уже существует' })
    }

    throw error
  }
}

export async function deleteProjectGovernanceAssignment(projectSlug: string, assignmentId: number) {
  const project = await getProjectGovernanceProjectOrThrow(projectSlug)
  const db = useDb()
  const [currentAssignment] = await db
    .select(projectScopeAssignmentReturning)
    .from(projectScopeAssignments)
    .where(and(eq(projectScopeAssignments.projectId, project.id), eq(projectScopeAssignments.id, assignmentId)))
    .limit(1)

  if (!currentAssignment) {
    throw createError({ statusCode: 404, statusMessage: 'Назначение не найдено' })
  }

  try {
    return await db.transaction(async (tx) => {
      await tx.delete(projectScopeAssignments)
        .where(and(eq(projectScopeAssignments.projectId, project.id), eq(projectScopeAssignments.id, assignmentId)))

      const { revision } = await syncProjectGovernanceLegacySnapshotsTx(tx, project)

      return {
        assignment: mapAssignmentRowToContract(currentAssignment),
        revision,
      }
    })
  } catch (error) {
    if (isGovernanceTableMissing(error)) {
      throw createError({ statusCode: 500, statusMessage: 'Таблицы governance не готовы. Примените миграцию 0004_project_governance.sql' })
    }

    throw error
  }
}

export async function updateProjectGovernanceScopeSettings(
  projectSlug: string,
  scopeType: ProjectScopeType,
  scopeId: string,
  input: UpdateProjectScopeSettings,
  options: { merge?: boolean } = {},
) {
  const project = await getProjectGovernanceProjectOrThrow(projectSlug)
  const state = await getGovernanceState(project)
  const context = await resolveScopeContext(state, scopeType, scopeId)
  if (!context) {
    throw createError({ statusCode: 404, statusMessage: 'Контур проекта не найден' })
  }

  const sanitizedSettings = sanitizeGovernanceRecord(input.settings)
  const db = useDb()

  try {
    return await db.transaction(async (tx) => {
      const existingRows = await tx
        .select(projectScopeSettingsReturning)
        .from(projectScopeSettings)
        .where(and(
          eq(projectScopeSettings.projectId, project.id),
          eq(projectScopeSettings.scopeType, context.scopeType),
          eq(projectScopeSettings.scopeSource, context.scopeSource),
          eq(projectScopeSettings.scopeId, context.scopeId),
        ))
        .limit(1)

      let settingsRow = existingRows[0]
      const nextSettings = options.merge && settingsRow
        ? {
            ...(isRecord(settingsRow.settings) ? settingsRow.settings : {}),
            ...sanitizedSettings,
          }
        : sanitizedSettings

      if (settingsRow) {
        ;[settingsRow] = await tx.update(projectScopeSettings)
          .set({
            settings: nextSettings,
            updatedAt: new Date(),
          })
          .where(and(
            eq(projectScopeSettings.projectId, project.id),
            eq(projectScopeSettings.scopeType, context.scopeType),
            eq(projectScopeSettings.scopeSource, context.scopeSource),
            eq(projectScopeSettings.scopeId, context.scopeId),
          ))
          .returning(projectScopeSettingsReturning)
      } else {
        ;[settingsRow] = await tx.insert(projectScopeSettings)
          .values({
            projectId: project.id,
            scopeType: context.scopeType,
            scopeSource: context.scopeSource,
            scopeId: context.scopeId,
            settings: nextSettings,
            updatedAt: new Date(),
          })
          .returning(projectScopeSettingsReturning)
      }

      const { revision } = await syncProjectGovernanceLegacySnapshotsTx(tx, project)

      return {
        scopeSettings: mapSettingsRowToContract(settingsRow),
        scope: {
          scopeType: context.scopeType,
          scopeSource: context.scopeSource,
          scopeId: context.scopeId,
        } satisfies CanonicalScopeRef,
        revision,
      }
    })
  } catch (error) {
    if (isGovernanceTableMissing(error)) {
      throw createError({ statusCode: 500, statusMessage: 'Таблицы governance не готовы. Примените миграцию 0004_project_governance.sql' })
    }

    throw error
  }
}