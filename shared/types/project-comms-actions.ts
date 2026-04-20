import { z } from 'zod'
import { PROJECT_STATUSES } from './catalogs'

export const SupportedActionIds = z.enum([
  'assign_task',
  'accept_stage',
  'change_phase',
  'create_invoice',
  'create_task',
  'order_extra_service',
  'update_work_status',
])

export const ProjectCommsActionBodySchema = z.object({
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

export type ProjectCommsActionBody = z.infer<typeof ProjectCommsActionBodySchema>
