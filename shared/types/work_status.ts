import { z } from 'zod'

export const WorkItemStatus = z.enum(['pending', 'in_progress', 'done', 'skipped'])
export type WorkItemStatus = z.infer<typeof WorkItemStatus>

export const WorkStatusItemSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  contractorId: z.number().optional().nullable(),
  title: z.string().min(1),
  status: WorkItemStatus,
  dateStart: z.string().optional().nullable(),
  dateEnd: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  sortOrder: z.number(),
})
export type WorkStatusItem = z.infer<typeof WorkStatusItemSchema>
