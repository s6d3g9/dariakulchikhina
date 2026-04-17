import { ContractorRecoverSchema } from '~/shared/types/auth'
import { contractorRecover } from '~/server/modules/auth/contractor-auth.service'

/**
 * POST /api/auth/contractor-recover — reset contractor password via
 * recovery phrase.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, ContractorRecoverSchema)
  return await contractorRecover(body)
})
