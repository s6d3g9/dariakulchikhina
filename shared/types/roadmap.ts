import { z } from 'zod'

export const StageStatus = z.enum(['pending', 'in_progress', 'done', 'skipped'])
export type StageStatus = z.infer<typeof StageStatus>

export const RoadmapStageSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  stageKey: z.string().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: StageStatus,
  dateStart: z.string().optional().nullable(),
  dateEnd: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  sortOrder: z.number(),
})
export type RoadmapStage = z.infer<typeof RoadmapStageSchema>
