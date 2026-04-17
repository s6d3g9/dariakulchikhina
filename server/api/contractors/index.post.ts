import { CreateContractorSchema } from '~/shared/types/contractor/contractor'
import { createContractor } from '~/server/modules/contractors/contractors.service'

/**
 * POST /api/contractors — create a new contractor (company or master).
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateContractorSchema)
  return await createContractor(body)
})
