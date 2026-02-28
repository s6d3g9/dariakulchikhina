import { useDb } from '~/server/db/index'
import { workStatusItems, contractors } from '~/server/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
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
