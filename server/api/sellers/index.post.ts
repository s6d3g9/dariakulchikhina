import { useDb } from '~/server/db/index'
import { sellers } from '~/server/db/schema'
import { z } from 'zod'

const CreateSellerSchema = z.object({
  name: z.string().min(1).max(200),
  companyName: z.string().max(200).optional().default(''),
  contactPerson: z.string().max(200).optional().default(''),
  phone: z.string().max(50).optional().default(''),
  email: z.string().max(200).optional().default(''),
  telegram: z.string().max(100).optional().default(''),
  website: z.string().max(500).optional().default(''),
  city: z.string().max(200).optional().default(''),
  categories: z.array(z.string().max(200)).max(50).optional().default([]),
  notes: z.string().max(5000).optional().default(''),
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
