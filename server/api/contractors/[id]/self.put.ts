import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const SelfUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  companyName: z.string().max(200).nullable().optional(),
  contactPerson: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  messenger: z.string().max(100).nullable().optional(),
  messengerNick: z.string().max(100).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  workTypes: z.array(z.string().max(100)).max(50).optional(),
  roleTypes: z.array(z.string().max(100)).max(50).optional(),
  // Паспортные данные
  passportSeries: z.string().max(10).nullable().optional(),
  passportNumber: z.string().max(10).nullable().optional(),
  passportIssuedBy: z.string().max(500).nullable().optional(),
  passportIssueDate: z.string().max(20).nullable().optional(),
  passportDepartmentCode: z.string().max(20).nullable().optional(),
  birthDate: z.string().max(20).nullable().optional(),
  birthPlace: z.string().max(500).nullable().optional(),
  registrationAddress: z.string().max(500).nullable().optional(),
  snils: z.string().max(20).nullable().optional(),
  // Доп. контакты
  telegram: z.string().max(200).nullable().optional(),
  whatsapp: z.string().max(50).nullable().optional(),
  city: z.string().max(200).nullable().optional(),
  workRadius: z.string().max(100).nullable().optional(),
  // Реквизиты
  inn: z.string().max(20).nullable().optional(),
  kpp: z.string().max(20).nullable().optional(),
  ogrn: z.string().max(20).nullable().optional(),
  bankName: z.string().max(300).nullable().optional(),
  bik: z.string().max(20).nullable().optional(),
  settlementAccount: z.string().max(30).nullable().optional(),
  correspondentAccount: z.string().max(30).nullable().optional(),
  legalAddress: z.string().max(500).nullable().optional(),
  factAddress: z.string().max(500).nullable().optional(),
  // Финансовые / организационные
  taxSystem: z.string().max(50).nullable().optional(),
  paymentMethods: z.array(z.string().max(50)).max(10).optional(),
  hourlyRate: z.string().max(50).nullable().optional(),
  hasInsurance: z.boolean().optional(),
  insuranceDetails: z.string().max(1000).nullable().optional(),
  education: z.string().max(500).nullable().optional(),
  certifications: z.array(z.string().max(200)).max(20).optional(),
  experienceYears: z.number().int().min(0).max(100).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  // Auth: contractor can only edit themselves, admin can edit anyone
  requireAdminOrContractor(event, id)

  const body = await readValidatedNodeBody(event, SelfUpdateSchema)
  const db = useDb()
  const [updated] = await db
    .update(contractors)
    .set(body)
    .where(eq(contractors.id, id))
    .returning()
  if (!updated) throw createError({ statusCode: 404 })
  return updated
})
