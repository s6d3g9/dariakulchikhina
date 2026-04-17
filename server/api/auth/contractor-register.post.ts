import { ContractorRegisterSchema } from '~/shared/types/auth'
import { contractorRegister } from '~/server/modules/auth/contractor-auth.service'

/**
 * POST /api/auth/contractor-register — create a contractor row.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, ContractorRegisterSchema)
  return await contractorRegister(body)
})
