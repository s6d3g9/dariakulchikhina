import { useDb } from '~/server/db/index'
import { designerProjects, designers } from '~/server/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { getNormalizedDesignerServiceKeySet, normalizeDesignerPackages, normalizeDesignerServices, normalizeDesignerSubscriptions } from '~/shared/utils/designer/designer-catalogs'
import { requireIntParam } from '~/server/utils/query'

const zCatalogItem = z.record(z.string().max(200), z.union([z.string().max(1000), z.number(), z.boolean(), z.null(), z.array(z.string().max(200)).max(50)]))

const UpdateDesignerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  companyName: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().max(200).optional(),
  telegram: z.string().max(100).optional(),
  website: z.string().max(500).optional(),
  city: z.string().max(200).optional(),
  experience: z.string().max(200).optional(),
  about: z.string().max(5000).optional(),
  specializations: z.array(z.string().max(200)).max(50).optional(),
  services: z.array(zCatalogItem).max(100).optional(),
  packages: z.array(zCatalogItem).max(100).optional(),
  subscriptions: z.array(zCatalogItem).max(100).optional(),
  clearProjectPackageKeysForIds: z.array(z.number().int().positive()).max(200).optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = requireIntParam(event, 'id')

  const body = await readValidatedNodeBody(event, UpdateDesignerSchema)
  const db = useDb()

  const [currentDesigner] = await db.select().from(designers).where(eq(designers.id, id)).limit(1)
  if (!currentDesigner) {
    throw createError({ statusCode: 404, statusMessage: 'Designer not found' })
  }

  const normalizedServices = body.services !== undefined
    ? normalizeDesignerServices(body.services)
    : normalizeDesignerServices(currentDesigner.services)
  const validServiceKeys = getNormalizedDesignerServiceKeySet(normalizedServices)

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name
  if (body.companyName !== undefined) updates.companyName = body.companyName || null
  if (body.phone !== undefined) updates.phone = body.phone || null
  if (body.email !== undefined) updates.email = body.email || null
  if (body.telegram !== undefined) updates.telegram = body.telegram || null
  if (body.website !== undefined) updates.website = body.website || null
  if (body.city !== undefined) updates.city = body.city || null
  if (body.experience !== undefined) updates.experience = body.experience || null
  if (body.about !== undefined) updates.about = body.about || null
  if (body.specializations !== undefined) updates.specializations = body.specializations
  if (body.services !== undefined) updates.services = normalizedServices
  if (body.packages !== undefined) updates.packages = normalizeDesignerPackages(body.packages, { validServiceKeys })
  if (body.subscriptions !== undefined) updates.subscriptions = normalizeDesignerSubscriptions(body.subscriptions, { validServiceKeys })

  const clearProjectPackageKeysForIds = Array.from(new Set(body.clearProjectPackageKeysForIds || []))

  const updated = await db.transaction(async (tx) => {
    const [designer] = await tx.update(designers).set(updates).where(eq(designers.id, id)).returning()

    if (clearProjectPackageKeysForIds.length) {
      await tx.update(designerProjects)
        .set({ packageKey: null })
        .where(and(
          eq(designerProjects.designerId, id),
          inArray(designerProjects.id, clearProjectPackageKeysForIds),
        ))
    }

    return designer
  })

  return updated
})
