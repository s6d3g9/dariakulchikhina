import * as repo from './sellers.repository'
import type { CreateSellerInput, UpdateSellerInput, ListSellersOptions } from './sellers.types'

export * from './sellers.types'

/**
 * Admin list of sellers. With `projectSlug` returns only sellers linked
 * to that project via `seller_projects`; without it — all sellers
 * ordered by createdAt.
 */
export async function listSellers(opts: ListSellersOptions = {}) {
  if (opts.projectSlug) {
    const sellers = await repo.listSellersByProjectSlug(opts.projectSlug)
    return sellers ?? []
  }
  return repo.listAllSellers()
}

export async function getSeller(id: number) {
  return repo.findSellerById(id)
}

export async function createSeller(body: CreateSellerInput) {
  return repo.insertSeller({
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
}

/**
 * Partial-update a seller. Empty strings are mapped to null so the DB
 * column stays consistent (column is nullable text).
 */
export async function updateSeller(id: number, body: UpdateSellerInput) {
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

  return repo.updateSellerRow(id, updates)
}

export async function deleteSeller(id: number) {
  return repo.deleteSellerRow(id)
}

/**
 * Projects the seller is linked to via `seller_projects`.
 */
export async function listSellerProjects(sellerId: number) {
  return repo.listSellerProjects(sellerId)
}
