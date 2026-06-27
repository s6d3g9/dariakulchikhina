import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  const id = requireIntParam(event, 'id')
  // Allow admin or the contractor themselves
  requireAdminOrContractor(event, id)
  const db = useDb()
  const [contractor] = await db.select().from(contractors).where(eq(contractors.id, id)).limit(1)
  if (!contractor) throw createError({ statusCode: 404 })
  // Strip sensitive fields — slug is used for contractor auth
  const { slug: _slug, ...safe } = contractor
  return safe
})
