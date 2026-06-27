import { useDb } from '~/server/db/index'
import { managers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { requireIntParam } from '~/server/utils/query'

const UpdateManagerSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  role: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().max(200).optional(),
  telegram: z.string().max(100).optional(),
  city: z.string().max(200).optional(),
  notes: z.string().max(5000).optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = requireIntParam(event, 'id')

  const body = await readValidatedNodeBody(event, UpdateManagerSchema)
  const db = useDb()

  const [updated] = await db.update(managers).set({
    ...body,
    updatedAt: new Date(),
  }).where(eq(managers.id, id)).returning()

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Manager not found' })
  return updated
})
