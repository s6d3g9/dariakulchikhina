import { useDb } from '../../db/index'
import { sellers } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireIntParam } from '~/server/utils/query'

const UpdateSellerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  companyName: z.string().max(200).optional(),
  contactPerson: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().max(200).optional(),
  inn: z.string().max(20).optional(),
  kpp: z.string().max(20).optional(),
  ogrn: z.string().max(20).optional(),
  bankName: z.string().max(200).optional(),
  bik: z.string().max(20).optional(),
  settlementAccount: z.string().max(30).optional(),
  correspondentAccount: z.string().max(30).optional(),
  legalAddress: z.string().max(500).optional(),
  factAddress: z.string().max(500).optional(),
  categories: z.array(z.string().max(200)).max(50).optional(),
  notes: z.string().max(5000).optional(),
  messenger: z.string().max(100).optional(),
  messengerNick: z.string().max(100).optional(),
  website: z.string().max(500).optional(),
  telegram: z.string().max(100).optional(),
  whatsapp: z.string().max(100).optional(),
  city: z.string().max(200).optional(),
  deliveryTerms: z.string().max(2000).optional(),
  paymentTerms: z.string().max(2000).optional(),
  minOrder: z.string().max(100).optional(),
  discount: z.string().max(100).optional(),
  rating: z.number().int().min(1).max(5).optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = requireIntParam(event, 'id')

  const body = await readValidatedNodeBody(event, UpdateSellerSchema)
  const db = useDb()

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name
  if (body.companyName !== undefined) updates.companyName = body.companyName || null
  if (body.contactPerson !== undefined) updates.contactPerson = body.contactPerson || null
  if (body.phone !== undefined) updates.phone = body.phone || null
  if (body.email !== undefined) updates.email = body.email || null
  if (body.inn !== undefined) updates.inn = body.inn || null
  if (body.kpp !== undefined) updates.kpp = body.kpp || null
  if (body.ogrn !== undefined) updates.ogrn = body.ogrn || null
  if (body.bankName !== undefined) updates.bankName = body.bankName || null
  if (body.bik !== undefined) updates.bik = body.bik || null
  if (body.settlementAccount !== undefined) updates.settlementAccount = body.settlementAccount || null
  if (body.correspondentAccount !== undefined) updates.correspondentAccount = body.correspondentAccount || null
  if (body.legalAddress !== undefined) updates.legalAddress = body.legalAddress || null
  if (body.factAddress !== undefined) updates.factAddress = body.factAddress || null
  if (body.categories !== undefined) updates.categories = body.categories
  if (body.notes !== undefined) updates.notes = body.notes || null
  if (body.messenger !== undefined) updates.messenger = body.messenger || null
  if (body.messengerNick !== undefined) updates.messengerNick = body.messengerNick || null
  if (body.website !== undefined) updates.website = body.website || null
  if (body.telegram !== undefined) updates.telegram = body.telegram || null
  if (body.whatsapp !== undefined) updates.whatsapp = body.whatsapp || null
  if (body.city !== undefined) updates.city = body.city || null
  if (body.deliveryTerms !== undefined) updates.deliveryTerms = body.deliveryTerms || null
  if (body.paymentTerms !== undefined) updates.paymentTerms = body.paymentTerms || null
  if (body.minOrder !== undefined) updates.minOrder = body.minOrder || null
  if (body.discount !== undefined) updates.discount = body.discount || null
  if (body.rating !== undefined) updates.rating = body.rating ?? null

  const [updated] = await db.update(sellers).set(updates).where(eq(sellers.id, id)).returning()
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Seller not found' })
  return updated
})
