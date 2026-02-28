import { useDb } from '~/server/db/index'
import { workStatusItems } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const UpdateSchema = z.object({
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
  dateStart: z.string().nullable().optional(),
  dateEnd: z.string().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))
  const adminS = getAdminSession(event)
  const contractorS = getContractorSession(event)
  if (!adminS && contractorS !== contractorId)
    throw createError({ statusCode: 401 })

  const body = await readValidatedNodeBody(event, UpdateSchema)
  const db = useDb()
  const [updated] = await db
    .update(workStatusItems)
    .set(body)
    .where(and(
      eq(workStatusItems.id, itemId),
      eq(workStatusItems.contractorId, contractorId),
    ))
    .returning()
  if (!updated) throw createError({ statusCode: 404 })
  return updated
})
