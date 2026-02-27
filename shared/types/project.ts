import { z } from 'zod'

export const ClientProfileSchema = z.object({
  // personal
  fio: z.string().optional(),
  birthday: z.string().optional(),
  age: z.string().optional(),
  familyStatus: z.string().optional(),
  children: z.string().optional(),
  pets: z.string().optional(),
  photo: z.string().optional(),
  // contacts
  phone: z.string().optional(),
  phoneExtra: z.string().optional(),
  email: z.string().optional(),
  messenger: z.string().optional(),
  messengerNick: z.string().optional(),
  preferredContact: z.string().optional(),
  address: z.string().optional(),
  // object
  objectAddress: z.string().optional(),
  objectType: z.string().optional(),
  objectTypeCode: z.string().optional(),
  objectCondition: z.string().optional(),
  objectArea: z.string().optional(),
  roomCount: z.string().optional(),
  floor: z.string().optional(),
  ceilingHeight: z.string().optional(),
  hasBalcony: z.string().optional(),
  parking: z.string().optional(),
  // project
  budget: z.string().optional(),
  budgetIncluded: z.string().optional(),
  deadline: z.string().optional(),
  paymentMethod: z.string().optional(),
  referralSource: z.string().optional(),
  previousExperience: z.string().optional(),
  // lifestyle
  lifestyle: z.string().optional(),
  hobbies: z.string().optional(),
  stylePreferences: z.string().optional(),
  colorPreferences: z.string().optional(),
  allergies: z.string().optional(),
  priorities: z.string().optional(),
  dislikes: z.string().optional(),
  notes: z.string().optional(),
  // catalog selects
  clientType: z.string().optional(),
  objectTypeCode2: z.string().optional(),
  projectPriority: z.string().optional(),
  roadmapComplexity: z.string().optional(),
  paymentType: z.string().optional(),
  contractType: z.string().optional(),
  roadmapStageType: z.string().optional(),
  // chips (multi-select arrays)
  designerServiceTypes: z.array(z.string()).optional(),
  contractorWorkTypes: z.array(z.string()).optional(),
}).passthrough()
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
