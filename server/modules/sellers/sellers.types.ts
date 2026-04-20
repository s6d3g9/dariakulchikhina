import { z } from 'zod'

export const CreateSellerSchema = z.object({
  name: z.string().min(1),
  companyName: z.string().optional().default(''),
  contactPerson: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  telegram: z.string().optional().default(''),
  website: z.string().optional().default(''),
  city: z.string().optional().default(''),
  categories: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(''),
})
export type CreateSellerInput = z.infer<typeof CreateSellerSchema>

export const UpdateSellerSchema = z.object({
  name: z.string().min(1).optional(),
  companyName: z.string().optional(),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  inn: z.string().optional(),
  kpp: z.string().optional(),
  ogrn: z.string().optional(),
  bankName: z.string().optional(),
  bik: z.string().optional(),
  settlementAccount: z.string().optional(),
  correspondentAccount: z.string().optional(),
  legalAddress: z.string().optional(),
  factAddress: z.string().optional(),
  categories: z.array(z.string()).optional(),
  notes: z.string().optional(),
  messenger: z.string().optional(),
  messengerNick: z.string().optional(),
  website: z.string().optional(),
  telegram: z.string().optional(),
  whatsapp: z.string().optional(),
  city: z.string().optional(),
  deliveryTerms: z.string().optional(),
  paymentTerms: z.string().optional(),
  minOrder: z.string().optional(),
  discount: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
})
export type UpdateSellerInput = z.infer<typeof UpdateSellerSchema>

export interface ListSellersOptions {
  projectSlug?: string
}
