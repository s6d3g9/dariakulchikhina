import { useDb } from '~/server/db/index'
import { workStatusItems, contractors } from '~/server/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { requireIntParam } from '~/server/utils/query'

const UpdateSchema = z.object({
  status: z.string().max(50).optional(),
  notes: z.string().max(5000).nullable().optional(),
  dateStart: z.string().max(50).nullable().optional(),
  dateEnd: z.string().max(50).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const contractorId = requireIntParam(event, 'id')
  const itemId = requireIntParam(event, 'itemId')
  // Auth: admin or the contractor themselves
  requireAdminOrContractor(event, contractorId)

  const body = await readValidatedNodeBody(event, UpdateSchema)
  const db = useDb()

  // Разрешаем редактировать задачи своих мастеров (если это компания)
  const staff = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(eq(contractors.parentId, contractorId))
  const allIds = [contractorId, ...staff.map((s: any) => s.id)]

  const [updated] = await db
    .update(workStatusItems)
    .set(body)
    .where(and(
      eq(workStatusItems.id, itemId),
      inArray(workStatusItems.contractorId, allIds),
    ))
    .returning()
  if (!updated) throw createError({ statusCode: 404 })
  return updated
})
