import { useDb } from '~/server/db/index'
import { designers } from '~/server/db/schema'
import { z } from 'zod'
import { getNormalizedDesignerServiceKeySet, normalizeDesignerPackages, normalizeDesignerServices, normalizeDesignerSubscriptions } from '~/shared/utils/designer/designer-catalogs'

const zCatalogItem = z.record(z.string().max(200), z.union([z.string().max(1000), z.number(), z.boolean(), z.null(), z.array(z.string().max(200)).max(50)]))

const CreateDesignerSchema = z.object({
  name: z.string().min(1).max(200),
  companyName: z.string().max(200).optional().default(''),
  phone: z.string().max(50).optional().default(''),
  email: z.string().max(200).optional().default(''),
  telegram: z.string().max(100).optional().default(''),
  website: z.string().max(500).optional().default(''),
  city: z.string().max(200).optional().default(''),
  experience: z.string().max(200).optional().default(''),
  about: z.string().max(5000).optional().default(''),
  specializations: z.array(z.string().max(200)).max(50).optional().default([]),
  services: z.array(zCatalogItem).max(100).optional().default([]),
  packages: z.array(zCatalogItem).max(100).optional().default([]),
  subscriptions: z.array(zCatalogItem).max(100).optional().default([]),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateDesignerSchema)
  const db = useDb()
  const normalizedServices = normalizeDesignerServices(body.services)
  const validServiceKeys = getNormalizedDesignerServiceKeySet(normalizedServices)

  const [designer] = await db.insert(designers).values({
    name: body.name,
    companyName: body.companyName || null,
    phone: body.phone || null,
    email: body.email || null,
    telegram: body.telegram || null,
    website: body.website || null,
    city: body.city || null,
    experience: body.experience || null,
    about: body.about || null,
    specializations: body.specializations,
    services: normalizedServices,
    packages: normalizeDesignerPackages(body.packages, { validServiceKeys }),
    subscriptions: normalizeDesignerSubscriptions(body.subscriptions, { validServiceKeys }),
  }).returning()

  return designer
})
