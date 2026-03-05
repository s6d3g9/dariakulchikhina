import { useDb } from '~/server/db/index'
import { sellers } from '~/server/db/schema'
import { z } from 'zod'

const CreateSellerSchema = z.object({
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

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateSellerSchema)
  const db = useDb()

  const [seller] = await db.insert(sellers).values({
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
  }).returning()

  return seller
})
