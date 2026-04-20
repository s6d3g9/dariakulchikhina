import { z } from 'zod'

export const CreateManagerSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  role: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  telegram: z.string().optional().default(''),
  city: z.string().optional().default(''),
  notes: z.string().optional().default(''),
})
export type CreateManagerInput = z.infer<typeof CreateManagerSchema>

export const UpdateManagerSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  telegram: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
})
export type UpdateManagerInput = z.infer<typeof UpdateManagerSchema>

export interface ListManagersOptions {
  projectSlug?: string
}
