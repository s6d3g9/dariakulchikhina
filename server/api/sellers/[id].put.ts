import { useDb } from '~/server/db/index'
import { sellers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const UpdateSellerSchema = z.object({
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

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid seller id' })

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
