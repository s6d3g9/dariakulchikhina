import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const idParam = getRouterParam(event, 'id')!
  // contractor can access their own record
  const adminS = getAdminSession(event)
  const contractorS = getContractorSession(event)
  const id = Number(idParam)
  if (!adminS && contractorS !== id)
    throw createError({ statusCode: 401 })
  const db = useDb()
  const [contractor] = await db.select().from(contractors).where(eq(contractors.id, id)).limit(1)
  if (!contractor) throw createError({ statusCode: 404 })
  return contractor
})
