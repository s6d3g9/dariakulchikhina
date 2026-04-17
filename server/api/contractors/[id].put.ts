import { UpdateContractorSchema } from '~/shared/types/contractor'
import { updateContractorAsAdmin } from '~/server/modules/contractors/contractors.service'

/**
 * PUT /api/contractors/[id] — admin-scoped full update. Slug is
 * stripped from the response because it is part of the contractor's
 * auth surface.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id')!)
  const body = await readValidatedNodeBody(event, UpdateContractorSchema)
  const updated = await updateContractorAsAdmin(id, body)
  if (!updated) throw createError({ statusCode: 404 })
  return updated
})
