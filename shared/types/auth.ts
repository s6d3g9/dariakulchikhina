import { z } from 'zod'

const LoginValueSchema = z.string().min(3).max(100).trim().toLowerCase().regex(/^[a-z0-9._-]+$/, 'Допустимы только a-z, 0-9, ., _, -')
const PasswordSchema = z.string().min(8).max(200)
  .refine(
    (val) => /[a-zA-Zа-яА-ЯёЁ]/.test(val) && /\d/.test(val),
    { message: 'Пароль должен содержать хотя бы одну букву и одну цифру' },
  )
const NameSchema = z.string().min(1).max(120).trim()

export const LoginSchema = z.object({
  login: z.string().min(3).max(100).trim().toLowerCase(),
  password: z.string().min(1).max(200),
})
export type LoginInput = z.infer<typeof LoginSchema>

export const RegisterSchema = z.object({
  login: LoginValueSchema,
  password: PasswordSchema,
  name: NameSchema.optional(),
})
export type RegisterInput = z.infer<typeof RegisterSchema>

export const RecoverSchema = z.object({
  login: z.string().min(3).max(100).trim().toLowerCase(),
  recoveryPhrase: z.string().min(20).max(500).trim(),
  newPassword: PasswordSchema,
})
export type RecoverInput = z.infer<typeof RecoverSchema>

export const ClientRegisterSchema = z.object({
  login: LoginValueSchema,
  password: PasswordSchema,
  name: NameSchema.optional(),
  projectTitle: z.string().min(1).max(160).trim().optional(),
})
export type ClientRegisterInput = z.infer<typeof ClientRegisterSchema>

export const ClientRecoverSchema = RecoverSchema
export type ClientRecoverInput = z.infer<typeof ClientRecoverSchema>

export const ContractorRegisterSchema = z.object({
  login: LoginValueSchema,
  password: PasswordSchema,
  name: NameSchema.optional(),
  companyName: z.string().min(1).max(160).trim().optional(),
})
export type ContractorRegisterInput = z.infer<typeof ContractorRegisterSchema>

export const ContractorRecoverSchema = RecoverSchema
export type ContractorRecoverInput = z.infer<typeof ContractorRecoverSchema>
