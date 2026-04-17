import { and, asc, eq } from 'drizzle-orm'

import { useDb } from '~/server/db/index'
import {
  contractors,
  documents,
  projectExtraServices,
  projectParticipants,
  projectScopeAssignments,
  projectScopeSettings,
  projects,
  workStatusItems,
} from '~/server/db/schema'

// ── Internal helpers ───────────────────────────────────────────────────

function isGovernanceTableMissingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || '')
  return /project_participants|project_scope_assignments|project_scope_settings/i.test(message)
    && /does not exist|relation .* does not exist|no such table/i.test(message)
}

async function safeGovernanceQuery<T>(loader: () => Promise<T>, fallback: T) {
  try {
    return await loader()
  } catch (error) {
    if (isGovernanceTableMissingError(error)) {
      return fallback
    }
    throw error
  }
}

// ── Returning shapes ───────────────────────────────────────────────────

export const participantReturning = {
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

export const assignmentReturning = {
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

export const scopeSettingsReturning = {
  id: projectScopeSettings.id,
  projectId: projectScopeSettings.projectId,
  scopeType: projectScopeSettings.scopeType,
  scopeSource: projectScopeSettings.scopeSource,
  scopeId: projectScopeSettings.scopeId,
  settings: projectScopeSettings.settings,
  updatedAt: projectScopeSettings.updatedAt,
}

// ── From project-governance-state.service.ts ──────────────────────────

export async function findGovernanceProject(slug: string) {
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
    .where(eq(projects.slug, slug))
    .limit(1)
  return project ?? null
}

export async function readGovernanceParticipants(projectId: number) {
  const db = useDb()
  return safeGovernanceQuery(() => db
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
    .orderBy(asc(projectParticipants.displayName)), [])
}

export async function readGovernanceAssignments(projectId: number) {
  const db = useDb()
  return safeGovernanceQuery(() => db
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
    .where(eq(projectScopeAssignments.projectId, projectId)), [])
}

export async function readGovernanceSettings(projectId: number) {
  const db = useDb()
  return safeGovernanceQuery(() => db
    .select({
      id: projectScopeSettings.id,
      scopeType: projectScopeSettings.scopeType,
      scopeSource: projectScopeSettings.scopeSource,
      scopeId: projectScopeSettings.scopeId,
      settings: projectScopeSettings.settings,
      updatedAt: projectScopeSettings.updatedAt,
    })
    .from(projectScopeSettings)
    .where(eq(projectScopeSettings.projectId, projectId)), [])
}

// ── Participant operations ─────────────────────────────────────────────

export async function findParticipantByProjectAndId(projectId: number, participantId: number) {
  const db = useDb()
  const [row] = await db
    .select(participantReturning)
    .from(projectParticipants)
    .where(and(eq(projectParticipants.projectId, projectId), eq(projectParticipants.id, participantId)))
    .limit(1)
  return row ?? null
}

export async function insertParticipantInTx(tx: any, values: Record<string, unknown>) {
  const [row] = await tx
    .insert(projectParticipants)
    .values(values)
    .returning(participantReturning)
  return row
}

export async function updateParticipantInTx(tx: any, projectId: number, participantId: number, updates: Record<string, unknown>) {
  const [row] = await tx
    .update(projectParticipants)
    .set(updates)
    .where(and(eq(projectParticipants.projectId, projectId), eq(projectParticipants.id, participantId)))
    .returning(participantReturning)
  return row ?? null
}

// ── Assignment operations ──────────────────────────────────────────────

export async function findAssignmentByProjectAndId(projectId: number, assignmentId: number) {
  const db = useDb()
  const [row] = await db
    .select(assignmentReturning)
    .from(projectScopeAssignments)
    .where(and(eq(projectScopeAssignments.projectId, projectId), eq(projectScopeAssignments.id, assignmentId)))
    .limit(1)
  return row ?? null
}

export async function insertAssignmentInTx(tx: any, values: Record<string, unknown>) {
  const [row] = await tx
    .insert(projectScopeAssignments)
    .values(values)
    .returning(assignmentReturning)
  return row
}

export async function updateAssignmentInTx(tx: any, projectId: number, assignmentId: number, updates: Record<string, unknown>) {
  const [row] = await tx
    .update(projectScopeAssignments)
    .set(updates)
    .where(and(eq(projectScopeAssignments.projectId, projectId), eq(projectScopeAssignments.id, assignmentId)))
    .returning(assignmentReturning)
  return row ?? null
}

export async function deleteAssignmentInTx(tx: any, projectId: number, assignmentId: number) {
  await tx
    .delete(projectScopeAssignments)
    .where(and(eq(projectScopeAssignments.projectId, projectId), eq(projectScopeAssignments.id, assignmentId)))
}

// ── Scope settings operations ──────────────────────────────────────────

export async function findScopeSettingsByContext(
  projectId: number,
  scopeType: string,
  scopeSource: string,
  scopeId: string,
) {
  const db = useDb()
  const [row] = await db
    .select(scopeSettingsReturning)
    .from(projectScopeSettings)
    .where(and(
      eq(projectScopeSettings.projectId, projectId),
      eq(projectScopeSettings.scopeType, scopeType),
      eq(projectScopeSettings.scopeSource, scopeSource),
      eq(projectScopeSettings.scopeId, scopeId),
    ))
    .limit(1)
  return row ?? null
}

export async function findScopeSettingsByContextInTx(
  tx: any,
  projectId: number,
  scopeType: string,
  scopeSource: string,
  scopeId: string,
) {
  const rows = await tx
    .select(scopeSettingsReturning)
    .from(projectScopeSettings)
    .where(and(
      eq(projectScopeSettings.projectId, projectId),
      eq(projectScopeSettings.scopeType, scopeType),
      eq(projectScopeSettings.scopeSource, scopeSource),
      eq(projectScopeSettings.scopeId, scopeId),
    ))
    .limit(1)
  return rows[0] ?? null
}

export async function insertScopeSettingsInTx(tx: any, values: Record<string, unknown>) {
  const [row] = await tx
    .insert(projectScopeSettings)
    .values(values)
    .returning(scopeSettingsReturning)
  return row
}

export async function updateScopeSettingsInTx(
  tx: any,
  projectId: number,
  scopeType: string,
  scopeSource: string,
  scopeId: string,
  updates: Record<string, unknown>,
) {
  const [row] = await tx
    .update(projectScopeSettings)
    .set(updates)
    .where(and(
      eq(projectScopeSettings.projectId, projectId),
      eq(projectScopeSettings.scopeType, scopeType),
      eq(projectScopeSettings.scopeSource, scopeSource),
      eq(projectScopeSettings.scopeId, scopeId),
    ))
    .returning(scopeSettingsReturning)
  return row
}

// ── Scope-detail DB queries (used in project-governance-summary.service.ts) ──

export async function findWorkTaskForScope(projectId: number, numericId: number) {
  const db = useDb()
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
    .where(and(eq(workStatusItems.projectId, projectId), eq(workStatusItems.id, numericId)))
    .limit(1)
  return workTask ?? null
}

export async function findDocumentForScope(projectId: number, numericId: number) {
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
    .where(and(eq(documents.projectId, projectId), eq(documents.id, numericId)))
    .limit(1)
  return document ?? null
}

export async function findExtraServiceForScope(projectId: number, numericId: number) {
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
    .where(and(eq(projectExtraServices.projectId, projectId), eq(projectExtraServices.id, numericId)))
    .limit(1)
  return service ?? null
}

// ── Sync snapshot helpers (used in syncProjectGovernanceLegacySnapshotsTx) ──

export async function readGovernanceSyncData(tx: any, projectId: number) {
  const [participantRows, assignmentRows] = await Promise.all([
    tx
      .select({
        id: projectParticipants.id,
        displayName: projectParticipants.displayName,
      })
      .from(projectParticipants)
      .where(eq(projectParticipants.projectId, projectId)),
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
      .where(eq(projectScopeAssignments.projectId, projectId))
      .orderBy(asc(projectScopeAssignments.assignedAt), asc(projectScopeAssignments.id)),
  ])
  return { participantRows, assignmentRows }
}

export async function updateProjectHybridControlInTx(
  tx: any,
  projectId: number,
  profile: Record<string, unknown>,
  nextControl: unknown,
) {
  const revisionDate = new Date()
  await tx.update(projects)
    .set({
      profile: {
        ...profile,
        hybridControl: nextControl,
      } as any,
      updatedAt: revisionDate,
    })
    .where(eq(projects.id, projectId))
  return revisionDate
}
