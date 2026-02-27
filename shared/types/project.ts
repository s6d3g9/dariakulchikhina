import { z } from 'zod'

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
})
export const UpdateProjectSchema = CreateProjectSchema.partial().extend({
  pages: z.array(z.string()).optional(),
  profile: ClientProfileSchema.optional(),
})
export type Project = z.infer<typeof ProjectSchema>
export type CreateProject = z.infer<typeof CreateProjectSchema>
export type UpdateProject = z.infer<typeof UpdateProjectSchema>
