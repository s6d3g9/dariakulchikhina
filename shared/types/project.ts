import { z } from 'zod'
import {
  CLIENT_TYPES,
  CONTRACT_TYPES,
  CONTRACTOR_TYPES,
  CONTRACTOR_ROLE_TYPES,
  CONTRACTOR_WORK_TYPES,
  DESIGNER_SERVICE_TYPES,
  MATERIAL_TYPES,
  OBJECT_TYPES,
  PAYMENT_TYPES,
  PROJECT_PRIORITY_TYPES,
  ROADMAP_COMPLEXITY_TYPES,
  ROADMAP_STAGE_TYPES,
} from './catalogs'

export const ClientProfileSchema = z.object({
  fio: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  photo: z.string().optional(),
  address: z.string().optional(),
  objectAddress: z.string().optional(),
  budget: z.string().optional(),
  deadline: z.string().optional(),
  notes: z.string().optional(),
  messengers: z.string().optional(),
  familyStatus: z.string().optional(),
  children: z.string().optional(),
  pets: z.string().optional(),
  paymentMethod: z.string().optional(),
  clientType: z.enum(CLIENT_TYPES).optional(),
  roadmapType: z.enum(ROADMAP_STAGE_TYPES).optional(),
  materialType: z.enum(MATERIAL_TYPES).optional(),
  contractorType: z.enum(CONTRACTOR_TYPES).optional(),
  contractorRoleTypes: z.array(z.enum(CONTRACTOR_ROLE_TYPES)).optional(),
  contractType: z.enum(CONTRACT_TYPES).optional(),
  paymentType: z.enum(PAYMENT_TYPES).optional(),
  objectType: z.enum(OBJECT_TYPES).optional(),
  projectPriority: z.enum(PROJECT_PRIORITY_TYPES).optional(),
  roadmapComplexity: z.enum(ROADMAP_COMPLEXITY_TYPES).optional(),
  designerServiceTypes: z.array(z.enum(DESIGNER_SERVICE_TYPES)).optional(),
  contractorWorkTypes: z.array(z.enum(CONTRACTOR_WORK_TYPES)).optional(),
})
export type ClientProfile = z.infer<typeof ClientProfileSchema>

export const ProjectSchema = z.object({
  id: z.number(),
  slug: z.string().min(1),
  title: z.string().min(1),
  clientPin: z.string().optional().nullable(),
  pages: z.array(z.string()),
  profile: ClientProfileSchema,
})
export const CreateProjectSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9_-]+$/),
  title: z.string().min(1),
  clientPin: z.string().optional(),
  roadmapTemplateKey: z.string().optional(),
})
export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  pages: z.array(z.string()).optional(),
  profile: ClientProfileSchema.optional(),
})
export type Project = z.infer<typeof ProjectSchema>
export type CreateProject = z.infer<typeof CreateProjectSchema>
export type UpdateProject = z.infer<typeof UpdateProjectSchema>
