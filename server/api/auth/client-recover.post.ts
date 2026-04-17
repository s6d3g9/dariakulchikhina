import { ClientRecoverSchema } from '~/shared/types/auth'
import { clientRecover } from '~/server/modules/auth/client-auth.service'

/**
 * POST /api/auth/client-recover — reset client password via recovery
 * phrase.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, ClientRecoverSchema)
  return await clientRecover(body)
})
