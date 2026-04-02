import { eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { contractors } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const idParam = getRouterParam(event, 'id')
  const contractorId = Number(idParam)

  if (!Number.isInteger(contractorId) || contractorId <= 0) {
    return null
  }

  const db = useDb()
  const [contractor] = await db
    .select()
    .from(contractors)
    .where(eq(contractors.id, contractorId))
    .limit(1)

  if (!contractor) {
    return null
  }

  const { slug: _slug, ...safeContractor } = contractor
  return safeContractor
})