import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const SelfUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  companyName: z.string().nullable().optional(),
  contactPerson: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  messenger: z.string().nullable().optional(),
  messengerNick: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  workTypes: z.array(z.string()).optional(),
  roleTypes: z.array(z.string()).optional(),
})

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const contractorS = getContractorSession(event)
  const adminS = getAdminSession(event)
  if (!adminS && contractorS !== id)
    throw createError({ statusCode: 401 })

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
