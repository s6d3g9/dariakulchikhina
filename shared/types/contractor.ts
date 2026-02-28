import { z } from 'zod'

export const ContractorSchema = z.object({
  id: z.number(),
  slug: z.string().min(1),
  name: z.string().min(1),
  companyName: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  inn: z.string().optional().nullable(),
  kpp: z.string().optional().nullable(),
  ogrn: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bik: z.string().optional().nullable(),
  settlementAccount: z.string().optional().nullable(),
  correspondentAccount: z.string().optional().nullable(),
  legalAddress: z.string().optional().nullable(),
  factAddress: z.string().optional().nullable(),
  workTypes: z.array(z.string()),
  roleTypes: z.array(z.string()).optional().default([]),
  contractorType: z.enum(['master', 'company']).default('master'),
  parentId: z.number().optional().nullable(),
  pin: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  messenger: z.string().optional().nullable(),
  messengerNick: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
})
export const CreateContractorSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9_-]+$/),
  name: z.string().min(1),
  pin: z.string().optional(),
  contractorType: z.enum(['master', 'company']).default('master'),
  parentId: z.number().optional().nullable(),
})
export const UpdateContractorSchema = ContractorSchema.omit({ id: true }).partial()
export type Contractor = z.infer<typeof ContractorSchema>
