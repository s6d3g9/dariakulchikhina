import { z } from 'zod'
import {
  CLIENT_TYPES,
  OBJECT_TYPES,
  ROADMAP_COMPLEXITY_TYPES,
  ROADMAP_STAGE_TYPES,
} from './catalogs'

export const RoadmapTemplateStageSchema = z.object({
  stageKey: z.enum(ROADMAP_STAGE_TYPES),
  title: z.string().min(1),
  description: z.string().optional(),
  notes: z.string().optional(),
})

export const RoadmapTemplateSchema = z.object({
  key: z.string().min(1),
  title: z.string().min(1),
  objectType: z.enum(OBJECT_TYPES),
  clientType: z.enum(CLIENT_TYPES),
  complexity: z.enum(ROADMAP_COMPLEXITY_TYPES),
  description: z.string().default(''),
  stages: z.array(RoadmapTemplateStageSchema).min(1),
})

export const CreateRoadmapTemplateSchema = RoadmapTemplateSchema.omit({ key: true })

export type RoadmapTemplateStage = z.infer<typeof RoadmapTemplateStageSchema>
export type RoadmapTemplate = z.infer<typeof RoadmapTemplateSchema>
export type CreateRoadmapTemplate = z.infer<typeof CreateRoadmapTemplateSchema>
