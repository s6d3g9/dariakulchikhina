import { and, asc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'

import { useDb } from '~/server/db'
import {
  contractors,
  projects,
  workStatusItemComments,
  workStatusItemPhotos,
  workStatusItems,
} from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import {
  API_V1_TASK_WORKER_STATUSES,
  apiV1TaskWorkerStatusLabel,
  createApiV1TasksWorkItemsDto,
  getApiV1TaskAllowedTransitions,
  normalizeApiV1TaskWorkerStatus,
  type ApiV1TaskContractorRow,
  type ApiV1TaskLegacyWorkItemRow,
  type ApiV1TaskStatusTransitionActor,
} from '~/server/utils/api-v1-tasks'
import { createSkippedApiV1OutboxResult, emitApiV1OutboxEvent } from '~/server/utils/api-v1-outbox'
import { getAdminSession, getContractorSession } from '~/server/utils/auth'
import { requireIntParam } from '~/server/utils/query'
import type { ApiV1TaskStatusAction } from '~/shared/types/api-v1'

const StatusActionSchema = z.object({
  status: z.enum(API_V1_TASK_WORKER_STATUSES),
  note: z.string().max(5000).optional(),
})

type WorkItemRow = ApiV1TaskLegacyWorkItemRow & {
  rawStatus: string
}

type ContractorPermissionRow = {
  id: number
  name: string
  companyName: string | null
  contractorType: string
  parentId: number | null
  roleTypes: string[]
}

function normalizeNote(value: string | undefined) {
  return typeof value === 'string' ? value.trim().slice(0, 5000) : ''
}

function actorName(actorRole: ApiV1TaskStatusTransitionActor, contractor?: ContractorPermissionRow | null) {
  if (actorRole === 'admin') return 'Studio OS'
  return contractor?.name?.trim() || contractor?.companyName?.trim() || 'Исполнитель'
}

function contractorActorRole(
  contractorId: number,
  assigned: ContractorPermissionRow | null,
): ApiV1TaskStatusTransitionActor {
  if (!assigned) return 'contractor'
  if (contractorId !== assigned.id) return 'foreman'
  if (assigned.roleTypes.includes('foreman') || assigned.roleTypes.includes('site_manager')) return 'foreman'
  return assigned.contractorType === 'company' ? 'contractor' : 'worker'
}

function assertStatusTransition(
  from: ReturnType<typeof normalizeApiV1TaskWorkerStatus>,
  to: ReturnType<typeof normalizeApiV1TaskWorkerStatus>,
  actorRole: ApiV1TaskStatusTransitionActor,
) {
  if (from === to) return

  const allowed = getApiV1TaskAllowedTransitions(from, actorRole)
  if (!allowed.includes(to)) {
    throw createError({
      statusCode: 409,
      statusMessage: `Transition ${from} -> ${to} is not allowed for ${actorRole}`,
    })
  }
}

async function loadWorkItem(db: ReturnType<typeof useDb>, itemId: number): Promise<WorkItemRow | null> {
  const [item] = await db
    .select({
      id: workStatusItems.id,
      project: {
        id: projects.id,
        slug: projects.slug,
        title: projects.title,
        status: projects.status,
        projectType: projects.projectType,
        updatedAt: projects.updatedAt,
      },
      contractorId: workStatusItems.contractorId,
      title: workStatusItems.title,
      workType: workStatusItems.workType,
      status: workStatusItems.status,
      rawStatus: workStatusItems.status,
      dateStart: workStatusItems.dateStart,
      dateEnd: workStatusItems.dateEnd,
      sortOrder: workStatusItems.sortOrder,
    })
    .from(workStatusItems)
    .innerJoin(projects, eq(projects.id, workStatusItems.projectId))
    .where(eq(workStatusItems.id, itemId))
    .limit(1)

  return item as WorkItemRow | null
}

async function loadContractorPermissionRow(db: ReturnType<typeof useDb>, contractorId: number | null) {
  if (!contractorId) return null

  const [contractor] = await db
    .select({
      id: contractors.id,
      name: contractors.name,
      companyName: contractors.companyName,
      contractorType: contractors.contractorType,
      parentId: contractors.parentId,
      roleTypes: contractors.roleTypes,
    })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1)

  return contractor || null
}

async function loadContractors(db: ReturnType<typeof useDb>) {
  return db
    .select({
      id: contractors.id,
      name: contractors.name,
      companyName: contractors.companyName,
      contactPerson: contractors.contactPerson,
      phone: contractors.phone,
      email: contractors.email,
      messenger: contractors.messenger,
      messengerNick: contractors.messengerNick,
      workTypes: contractors.workTypes,
      roleTypes: contractors.roleTypes,
      contractorType: contractors.contractorType,
      parentId: contractors.parentId,
      createdAt: contractors.createdAt,
    })
    .from(contractors)
    .orderBy(asc(contractors.name))
    .limit(1000)
}

async function enrichWorkItemCounts(db: ReturnType<typeof useDb>, item: WorkItemRow): Promise<ApiV1TaskLegacyWorkItemRow> {
  const [photoCountRow, commentCountRow] = await Promise.all([
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(workStatusItemPhotos)
      .where(eq(workStatusItemPhotos.itemId, item.id)),
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(workStatusItemComments)
      .where(eq(workStatusItemComments.itemId, item.id)),
  ])

  return {
    ...item,
    photoCount: photoCountRow[0]?.count || 0,
    commentCount: commentCountRow[0]?.count || 0,
  }
}

export default defineEventHandler(async (event) => {
  const itemId = requireIntParam(event, 'itemId')
  const admin = getAdminSession(event)
  const contractorSessionId = getContractorSession(event)
  if (!admin && !contractorSessionId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readValidatedNodeBody(event, StatusActionSchema)
  const requestedStatus = normalizeApiV1TaskWorkerStatus(body.status)
  const note = normalizeNote(body.note)
  const db = useDb()

  const current = await loadWorkItem(db, itemId)
  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Task not found' })
  }

  const assignedContractor = await loadContractorPermissionRow(db, current.contractorId)
  const actorContractor = contractorSessionId
    ? await loadContractorPermissionRow(db, contractorSessionId)
    : null

  let actorRole: ApiV1TaskStatusTransitionActor
  if (admin) {
    actorRole = 'admin'
  } else if (contractorSessionId) {
    const canManageAssignedTask = current.contractorId === contractorSessionId
      || assignedContractor?.parentId === contractorSessionId

    if (!canManageAssignedTask) {
      throw createError({ statusCode: 403, statusMessage: 'Task is not assigned to this worker or crew' })
    }

    actorRole = contractorActorRole(contractorSessionId, assignedContractor)
  } else {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const previousStatus = normalizeApiV1TaskWorkerStatus(current.status)
  assertStatusTransition(previousStatus, requestedStatus, actorRole)

  let auditCommentId: number | null = null
  const actorDisplayName = actorName(actorRole, actorContractor || assignedContractor)

  if (previousStatus !== requestedStatus) {
    const auditText = [
      `Статус задачи: ${apiV1TaskWorkerStatusLabel(previousStatus)} -> ${apiV1TaskWorkerStatusLabel(requestedStatus)}.`,
      note,
    ].filter(Boolean).join('\n')

    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(workStatusItems)
        .set({ status: requestedStatus })
        .where(and(
          eq(workStatusItems.id, itemId),
          eq(workStatusItems.status, current.rawStatus),
        ))
        .returning({ id: workStatusItems.id })

      if (!updated) {
        throw createError({ statusCode: 409, statusMessage: 'Task status was changed by another actor' })
      }

      const [comment] = await tx
        .insert(workStatusItemComments)
        .values({
          itemId,
          authorType: actorRole === 'admin' ? 'admin' : 'contractor',
          authorName: actorDisplayName,
          text: auditText,
        })
        .returning({ id: workStatusItemComments.id })

      auditCommentId = comment?.id || null
    })
  }

  const updatedItem = await loadWorkItem(db, itemId)
  if (!updatedItem) {
    throw createError({ statusCode: 404, statusMessage: 'Task not found after update' })
  }

  const [contractorRows, workItem] = await Promise.all([
    loadContractors(db),
    enrichWorkItemCounts(db, updatedItem),
  ])

  const workItemsDto = createApiV1TasksWorkItemsDto({
    contractors: contractorRows as ApiV1TaskContractorRow[],
    workItems: [workItem],
    filters: {
      limit: 1,
      offset: 0,
    },
  })

  const item = workItemsDto.items[0]
  if (!item) {
    throw createError({ statusCode: 500, statusMessage: 'Updated task could not be serialized' })
  }

  const outbox = previousStatus === requestedStatus
    ? createSkippedApiV1OutboxResult('no_state_change')
    : await emitApiV1OutboxEvent(event, {
      eventType: 'task.status_changed',
      eventVersion: 1,
      aggregateType: 'work_status_item',
      aggregateId: itemId,
      project: {
        id: current.project.id,
        slug: current.project.slug,
      },
      actor: {
        type: actorRole === 'admin'
          ? 'admin'
          : actorRole === 'worker' || actorRole === 'foreman'
            ? 'worker'
            : 'contractor',
        id: admin?.userId ?? contractorSessionId ?? null,
        role: actorRole,
        displayName: actorDisplayName,
      },
      audience: 'internal',
      deliveryTargets: ['activity_feed', 'messenger', 'audit'],
      idempotencyKey: `task-status:${itemId}:${previousStatus}:${requestedStatus}:${auditCommentId || 'no-audit'}`,
      causationId: auditCommentId ? `work_status_item_comments:${auditCommentId}` : undefined,
      payload: {
        project: {
          id: current.project.id,
          slug: current.project.slug,
          title: current.project.title,
        },
        task: {
          id: itemId,
          title: item.title,
          status: requestedStatus,
          statusLabel: apiV1TaskWorkerStatusLabel(requestedStatus),
        },
        transition: {
          from: previousStatus,
          to: requestedStatus,
          actorRole,
          reviewRequired: requestedStatus === 'ready_for_review',
          canWorkerSelfConfirm: false,
        },
        audit: {
          source: 'work_status_item_comments',
          id: auditCommentId,
        },
      },
    })

  const data: ApiV1TaskStatusAction = {
    item,
    transition: {
      from: previousStatus,
      to: requestedStatus,
      actorRole,
      canWorkerSelfConfirm: false,
      reviewRequired: requestedStatus === 'ready_for_review',
    },
    audit: {
      source: 'work_status_item_comments',
      id: auditCommentId,
    },
    outbox,
  }

  return createApiV1Envelope(event, data, {
    revision: `task-status:${itemId}:${previousStatus}:${requestedStatus}:${auditCommentId || 'noop'}`,
  })
})
