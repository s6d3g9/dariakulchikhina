import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { UpdateContractorSchema } from '~/shared/types/contractor'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id')!)
  const body = await readValidatedNodeBody(event, UpdateContractorSchema)
  const db = useDb()
  const [updated] = await db.update(contractors).set(body).where(eq(contractors.id, id)).returning()
  if (!updated) throw createError({ statusCode: 404 })
  return updated
})
