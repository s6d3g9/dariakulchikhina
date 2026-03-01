import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const SelfUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  companyName: z.string().max(200).nullable().optional(),
  contactPerson: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  messenger: z.string().max(100).nullable().optional(),
  messengerNick: z.string().max(100).nullable().optional(),
  website: z.string().max(500).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  workTypes: z.array(z.string().max(100)).max(50).optional(),
  roleTypes: z.array(z.string().max(100)).max(50).optional(),
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  // Auth: contractor can only edit themselves, admin can edit anyone
  requireAdminOrContractor(event, id)

  const body = await readValidatedNodeBody(event, SelfUpdateSchema)
  const db = useDb()
  const [updated] = await db
    .update(contractors)
    .set(body)
    .where(eq(contractors.id, id))
    .returning()
  if (!updated) throw createError({ statusCode: 404 })
  return updated
})
