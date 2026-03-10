import { useDb } from '~/server/db/index'
import { managers } from '~/server/db/schema'
import { z } from 'zod'

const CreateManagerSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  role: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().optional().default(''),
  telegram: z.string().optional().default(''),
  city: z.string().optional().default(''),
  notes: z.string().optional().default(''),
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
