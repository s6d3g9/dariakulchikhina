import { useDb } from '~/server/db/index'
import { designers } from '~/server/db/schema'
import { z } from 'zod'

const CreateDesignerSchema = z.object({
  name: z.string().min(1),
  companyName: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  telegram: z.string().optional().default(''),
  website: z.string().optional().default(''),
  city: z.string().optional().default(''),
  experience: z.string().optional().default(''),
  about: z.string().optional().default(''),
  specializations: z.array(z.string()).optional().default([]),
  services: z.array(z.any()).optional().default([]),
  packages: z.array(z.any()).optional().default([]),
  subscriptions: z.array(z.any()).optional().default([]),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateDesignerSchema)
  const db = useDb()

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
    services: body.services,
    packages: body.packages,
    subscriptions: body.subscriptions,
  }).returning()

  return designer
})
