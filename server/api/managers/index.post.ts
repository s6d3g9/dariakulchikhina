import { useDb } from '~/server/db/index'
import { managers } from '~/server/db/schema'
import { z } from 'zod'

const CreateManagerSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().max(200).optional(),
  role: z.string().max(200).optional().default(''),
  phone: z.string().max(50).optional().default(''),
  email: z.string().max(200).optional().default(''),
  telegram: z.string().max(100).optional().default(''),
  city: z.string().max(200).optional().default(''),
  notes: z.string().max(5000).optional().default(''),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateManagerSchema)
  const db = useDb()

  const slug = body.slug || body.name.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-').replace(/-+$/, '')

  const [manager] = await db.insert(managers).values({
    name: body.name,
    slug,
    role: body.role || null,
    phone: body.phone || null,
    email: body.email || null,
    telegram: body.telegram || null,
    city: body.city || null,
    notes: body.notes || null,
  }).returning()

  return manager
})
