import { useDb } from '~/server/db/index'
import { workStatusItemComments, workStatusItems, contractors } from '~/server/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({
  text: z.string().min(1).max(2000),
})

export default defineEventHandler(async (event) => {
  const contractorId = Number(getRouterParam(event, 'id'))
  const itemId = Number(getRouterParam(event, 'itemId'))
  const { text } = await readValidatedNodeBody(event, Body)
  const db = useDb()

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

  const [contractor] = await db
    .select({ name: contractors.name })
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1)

  const [comment] = await db.insert(workStatusItemComments).values({
    itemId,
    authorType: 'contractor',
    authorName: contractor?.name ?? 'Подрядчик',
    text,
  }).returning()

  return comment
})
