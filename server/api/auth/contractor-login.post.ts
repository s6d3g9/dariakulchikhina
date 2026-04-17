import {
  contractorLogin,
  ContractorLoginSchema,
} from '~/server/modules/auth/contractor-auth.service'

/**
 * POST /api/auth/contractor-login — slug-based or credential-based
 * contractor login. Sets the contractor session cookie on success.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, ContractorLoginSchema)
  return await contractorLogin(event, body)
})
