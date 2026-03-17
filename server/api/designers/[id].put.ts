import { useDb } from '~/server/db/index'
import { designerProjects, designers } from '~/server/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { normalizeDesignerPackages, normalizeDesignerServices, normalizeDesignerSubscriptions } from '~/shared/utils/designer-catalogs'

const UpdateDesignerSchema = z.object({
  name: z.string().min(1).optional(),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  telegram: z.string().optional(),
  website: z.string().optional(),
  city: z.string().optional(),
  experience: z.string().optional(),
  about: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  services: z.array(z.any()).optional(),
  packages: z.array(z.any()).optional(),
  subscriptions: z.array(z.any()).optional(),
  clearProjectPackageKeysForIds: z.array(z.number().int().positive()).optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })

  const body = await readValidatedNodeBody(event, UpdateDesignerSchema)
  const db = useDb()

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
  if (body.services !== undefined) updates.services = normalizeDesignerServices(body.services)
  if (body.packages !== undefined) updates.packages = normalizeDesignerPackages(body.packages)
  if (body.subscriptions !== undefined) updates.subscriptions = normalizeDesignerSubscriptions(body.subscriptions)

  const clearProjectPackageKeysForIds = Array.from(new Set(body.clearProjectPackageKeysForIds || []))

  const updated = await db.transaction(async (tx) => {
    const [designer] = await tx.update(designers).set(updates).where(eq(designers.id, id)).returning()
    if (!designer) {
      throw createError({ statusCode: 404, statusMessage: 'Designer not found' })
    }

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
