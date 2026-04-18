import type {
  CreateProjectParticipant,
  CreateProjectScopeAssignment,
  ProjectParticipant,
  ProjectParticipantRoleKey,
  ProjectParticipantSourceKind,
  ProjectResponsibilityKey,
  ProjectScopeAssignment,
  ProjectScopeSettings,
  ProjectScopeSource,
  ProjectScopeType,
  ProjectGovernanceSummary,
  UpdateProjectParticipant,
  UpdateProjectScopeAssignment,
  UpdateProjectScopeSettings,
} from '~/shared/types/project-governance'
import {
  getProjectParticipantRoleLabel,
} from '~/shared/utils/project-governance'
import { ensureHybridControl } from '~/shared/utils/project-control'
import {
  getGovernanceState,
  getProjectGovernanceProjectOrThrow,
  isGovernanceTableMissing,
  isRecord,
  joinParts,
  mapParticipantSourceToCatalogKind,
  normalizeAssignmentStatus,
  normalizeResponsibility,
  normalizeRoleKey,
  normalizeScopeSource,
  normalizeScopeType,
  normalizeSourceKind,
  toProfileRecord,
  type GovernanceState,
  type ProjectGovernanceProjectRow,
} from '~/server/modules/projects/project-governance-state.service'
import {
  resolveScopeContext,
  sanitizeGovernanceRecord,
} from '~/server/modules/projects/project-governance-summary.service'
import * as repo from '~/server/modules/projects/project-governance.repository'

export {
  getProjectGovernanceProject,
  getProjectGovernanceProjectOrThrow,
} from '~/server/modules/projects/project-governance-state.service'
export {
  buildProjectGovernanceSummary,
  buildProjectScopeDetail,
} from '~/server/modules/projects/project-governance-summary.service'

type CanonicalScopeRef = {
  scopeType: ProjectScopeType
  scopeSource: ProjectScopeSource
  scopeId: string
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
  const { participantRows, assignmentRows } = await repo.readGovernanceSyncData(tx, project.id)

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

  const revisionDate = await repo.updateProjectHybridControlInTx(tx, project.id, profile, nextControl)

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

export async function createProjectGovernanceParticipant(projectSlug: string, input: CreateProjectParticipant) {
  const project = await getProjectGovernanceProjectOrThrow(projectSlug)
  const sourceKind = input.sourceKind || 'custom'
  const sourceId = sourceKind === 'custom' ? undefined : input.sourceId
  assertGovernanceParticipantSource(sourceKind, sourceId)

  try {
    return await repo.runInTransaction(async (tx) => {
      const participantRow = await repo.insertParticipantInTx(tx, {
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
  const currentParticipant = await repo.findParticipantByProjectAndId(project.id, participantId)

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
    return await repo.runInTransaction(async (tx) => {
      const participantRow = await repo.updateParticipantInTx(tx, project.id, participantId, updates)

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
  const participantPersistedId = participant.persistedId

  const context = await resolveCanonicalScopeContextForMutation(state, input.scopeType, input.scopeSource, input.scopeId)
  if (!context) {
    throw createError({ statusCode: 404, statusMessage: 'Контур проекта не найден' })
  }

  try {
    return await repo.runInTransaction(async (tx) => {
      const assignmentValues: Record<string, unknown> = {
        projectId: project.id,
        participantId: participantPersistedId,
        scopeType: context.scopeType,
        scopeSource: context.scopeSource,
        scopeId: context.scopeId,
        responsibility: input.responsibility,
        status: input.status || 'active',
        dueDate: toNullableTrimmedString(input.dueDate),
        notes: toNullableTrimmedString(input.notes),
        meta: sanitizeGovernanceRecord(input.meta),
        assignedBy: toNullableTrimmedString(input.assignedBy) || toNullableTrimmedString(options.assignedBy),
        assignedAt: new Date(),
        updatedAt: new Date(),
      }

      if (typeof input.allocationPercent === 'number') {
        assignmentValues.allocationPercent = input.allocationPercent
      }

      const assignmentRow = await repo.insertAssignmentInTx(tx, assignmentValues)

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
  const currentAssignment = await repo.findAssignmentByProjectAndId(project.id, assignmentId)

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
    return await repo.runInTransaction(async (tx) => {
      const assignmentRow = await repo.updateAssignmentInTx(tx, project.id, assignmentId, updates)

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
  const currentAssignment = await repo.findAssignmentByProjectAndId(project.id, assignmentId)

  if (!currentAssignment) {
    throw createError({ statusCode: 404, statusMessage: 'Назначение не найдено' })
  }

  try {
    return await repo.runInTransaction(async (tx) => {
      await repo.deleteAssignmentInTx(tx, project.id, assignmentId)

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

  try {
    return await repo.runInTransaction(async (tx) => {
      const existingRow = await repo.findScopeSettingsByContextInTx(
        tx,
        project.id,
        context.scopeType,
        context.scopeSource,
        context.scopeId,
      )

      const nextSettings = options.merge && existingRow
        ? {
            ...(isRecord(existingRow.settings) ? existingRow.settings : {}),
            ...sanitizedSettings,
          }
        : sanitizedSettings

      let settingsRow: typeof existingRow
      if (existingRow) {
        settingsRow = await repo.updateScopeSettingsInTx(
          tx,
          project.id,
          context.scopeType,
          context.scopeSource,
          context.scopeId,
          { settings: nextSettings, updatedAt: new Date() },
        )
      } else {
        settingsRow = await repo.insertScopeSettingsInTx(tx, {
          projectId: project.id,
          scopeType: context.scopeType,
          scopeSource: context.scopeSource,
          scopeId: context.scopeId,
          settings: nextSettings,
          updatedAt: new Date(),
        })
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
