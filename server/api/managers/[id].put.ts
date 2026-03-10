import { useDb } from '~/server/db/index'
import { managers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const UpdateManagerSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  telegram: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid manager id' })

  const body = await readValidatedNodeBody(event, UpdateManagerSchema)
  const db = useDb()

  const [updated] = await db.update(managers).set({
    ...body,
    updatedAt: new Date(),
  }).where(eq(managers.id, id)).returning()

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Manager not found' })
  return updated
})
