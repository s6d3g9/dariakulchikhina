import { useDb } from '~/server/db/index'
import { workStatusItemPhotos, workStatusItems, contractors } from '~/server/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))
  // Auth: admin or the contractor themselves
  requireAdminOrContractor(event, contractorId)
  const db = useDb()

  // Проверяем доступ (свои задачи + задачи подчинённых)
  const staff = await db
    .select({ id: contractors.id })
    .from(contractors)
    .where(eq(contractors.parentId, contractorId))
  const allIds = [contractorId, ...staff.map((s: any) => s.id)]

  const [item] = await db
    .select({ id: workStatusItems.id })
    .from(workStatusItems)
    .where(and(eq(workStatusItems.id, itemId), inArray(workStatusItems.contractorId, allIds)))
    .limit(1)
  if (!item) throw createError({ statusCode: 403 })

  return db
    .select()
    .from(workStatusItemPhotos)
    .where(eq(workStatusItemPhotos.itemId, itemId))
    .orderBy(workStatusItemPhotos.createdAt)
})
