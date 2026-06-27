import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const id = requireIntParam(event, 'id')

  const db = useDb()
  const [contractor] = await db
    .select({ id: contractors.id, slug: contractors.slug, name: contractors.name })
    .from(contractors)
    .where(eq(contractors.id, id))
    .limit(1)

  if (!contractor) {
    throw createError({ statusCode: 404, statusMessage: 'Подрядчик не найден' })
  }

  const token = signContractorAccessToken(contractor.id, contractor.slug)

  return {
    id: contractor.id,
    slug: contractor.slug,
    name: contractor.name,
    token,
    loginUrl: `/login?role=contractor&cid=${contractor.id}&cslug=${encodeURIComponent(contractor.slug)}&ctoken=${encodeURIComponent(token)}`,
  }
})
