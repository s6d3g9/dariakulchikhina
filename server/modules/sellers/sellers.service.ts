import { z } from 'zod'
import { asc, eq } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { sellers, sellerProjects, projects } from '~/server/db/schema'

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

/**
 * Admin list of sellers. With `projectSlug` returns only sellers linked
 * to that project via `seller_projects`; without it — all sellers
 * ordered by createdAt.
 */
export async function listSellers(opts: ListSellersOptions = {}) {
  const db = useDb()

  if (opts.projectSlug) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, opts.projectSlug))
      .limit(1)
    if (!project) return []
    const rows = await db
      .select({ seller: sellers })
      .from(sellerProjects)
      .innerJoin(sellers, eq(sellerProjects.sellerId, sellers.id))
      .where(eq(sellerProjects.projectId, project.id))
      .orderBy(asc(sellers.name))
    return rows.map((r) => r.seller)
  }

  return db.select().from(sellers).orderBy(asc(sellers.createdAt))
}

export async function getSeller(id: number) {
  const db = useDb()
  const [seller] = await db.select().from(sellers).where(eq(sellers.id, id)).limit(1)
  return seller ?? null
}

export async function createSeller(body: CreateSellerInput) {
  const db = useDb()
  const [seller] = await db
    .insert(sellers)
    .values({
      name: body.name,
      companyName: body.companyName || null,
      contactPerson: body.contactPerson || null,
      phone: body.phone || null,
      email: body.email || null,
      telegram: body.telegram || null,
      website: body.website || null,
      city: body.city || null,
      categories: body.categories,
      notes: body.notes || null,
    })
    .returning()
  return seller
}

/**
 * Partial-update a seller. Empty strings are mapped to null so the DB
 * column stays consistent (column is nullable text).
 */
export async function updateSeller(id: number, body: UpdateSellerInput) {
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
  if (body.settlementAccount !== undefined)
    updates.settlementAccount = body.settlementAccount || null
  if (body.correspondentAccount !== undefined)
    updates.correspondentAccount = body.correspondentAccount || null
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

  const [updated] = await db
    .update(sellers)
    .set(updates)
    .where(eq(sellers.id, id))
    .returning()
  return updated ?? null
}

export async function deleteSeller(id: number) {
  const db = useDb()
  await db.delete(sellers).where(eq(sellers.id, id))
}

/**
 * Projects the seller is linked to via `seller_projects`.
 */
export async function listSellerProjects(sellerId: number) {
  const db = useDb()
  return db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
    })
    .from(sellerProjects)
    .innerJoin(projects, eq(sellerProjects.projectId, projects.id))
    .where(eq(sellerProjects.sellerId, sellerId))
}
