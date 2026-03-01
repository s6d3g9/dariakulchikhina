import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')!
  const id = Number(idParam)
  // Allow admin or the contractor themselves
  requireAdminOrContractor(event, id)
  const db = useDb()
  const [contractor] = await db.select().from(contractors).where(eq(contractors.id, id)).limit(1)
  if (!contractor) throw createError({ statusCode: 404 })
  return contractor
})
