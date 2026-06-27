import { z } from 'zod'

import { executeProjectCommunicationAction } from '~/server/modules/communications/communications-actions.service'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { emitApiV1OutboxEvent } from '~/server/utils/api-v1-outbox'
import { requireAdmin } from '~/server/utils/auth'
import { readValidatedNodeBody } from '~/server/utils/body'
import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { PROJECT_STATUSES } from '~/shared/types/project/catalogs'

const SupportedActionIds = z.enum([
  'assign_task',
  'accept_stage',
  'change_phase',
  'create_invoice',
  'create_task',
  'order_extra_service',
  'update_work_status',
])

const BodySchema = z.object({
  actionId: SupportedActionIds,
  payload: z.object({
    text: z.string().trim().max(5000).optional(),
    note: z.string().trim().max(5000).optional(),
    projectSlug: z.string().trim().min(1).max(200).optional(),
    projectTitle: z.string().trim().max(500).optional(),
    taskMode: z.enum(['existing', 'new']).optional(),
    taskId: z.string().trim().max(200).optional(),
    taskTitle: z.string().trim().max(500).optional(),
    taskStatus: z.string().trim().max(100).optional(),
    taskStatusLabel: z.string().trim().max(200).optional(),
    phaseKey: z.enum(PROJECT_STATUSES).optional(),
    phaseTitle: z.string().trim().max(500).optional(),
    sprintId: z.string().trim().max(200).optional(),
    sprintName: z.string().trim().max(500).optional(),
    subjectId: z.string().trim().max(200).optional(),
    subjectLabel: z.string().trim().max(500).optional(),
    objectId: z.string().trim().max(200).optional(),
    objectLabel: z.string().trim().max(500).optional(),
    rangeStart: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    rangeEnd: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    documentId: z.string().trim().max(200).optional(),
    documentTitle: z.string().trim().max(500).optional(),
    serviceId: z.string().trim().max(200).optional(),
    serviceTitle: z.string().trim().max(500).optional(),
  }).default({}),
})

export default defineEventHandler(async (event) => {
  applyMessengerCors(event, { methods: ['POST', 'OPTIONS'] })
  const admin = requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const body = await readValidatedNodeBody(event, BodySchema)
  const result = await executeProjectCommunicationAction(slug, body.actionId, body.payload)
  const outbox = await emitApiV1OutboxEvent(event, {
    eventType: 'messenger.action_executed',
    eventVersion: 1,
    aggregateType: result.mutation?.kind || 'project',
    aggregateId: result.mutation?.id || slug,
    project: {
      slug,
    },
    actor: {
      type: 'admin',
      id: admin.userId,
      role: 'admin',
      displayName: 'Studio OS',
    },
    audience: 'internal',
    deliveryTargets: ['activity_feed', 'messenger', 'audit'],
    payload: {
      projectSlug: slug,
      actionId: body.actionId,
      mutation: result.mutation,
      message: result.message,
      selection: {
        taskMode: body.payload.taskMode,
        taskId: body.payload.taskId,
        taskTitle: body.payload.taskTitle,
        taskStatus: body.payload.taskStatus,
        phaseKey: body.payload.phaseKey,
        phaseTitle: body.payload.phaseTitle,
        sprintId: body.payload.sprintId,
        subjectId: body.payload.subjectId,
        objectId: body.payload.objectId,
        documentId: body.payload.documentId,
        serviceId: body.payload.serviceId,
      },
    },
  })
  const data = {
    ok: true,
    actionId: body.actionId,
    projectSlug: slug,
    message: result.message,
    mutation: result.mutation,
    outbox,
  }

  return createApiV1Envelope(event, data, {
    revision: `messenger-action:${slug}:${body.actionId}:${result.mutation?.kind || 'none'}:${result.mutation?.id || 'none'}`,
  })
})
