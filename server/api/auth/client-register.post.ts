import { ClientRegisterSchema } from '~/shared/types/auth'
import { clientRegister } from '~/server/modules/auth/client-auth.service'

/**
 * POST /api/auth/client-register — create client + owning project row.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, ClientRegisterSchema)
  return await clientRegister(body)
})
