import { z } from 'zod'

export const LoginSchema = z.object({
  login: z.string().min(1),
  password: z.string().min(1),
})
export const PinLoginSchema = z.object({
  pin: z.string().min(1),
  projectSlug: z.string().optional(),
})
export type LoginInput = z.infer<typeof LoginSchema>
export type PinLoginInput = z.infer<typeof PinLoginSchema>
