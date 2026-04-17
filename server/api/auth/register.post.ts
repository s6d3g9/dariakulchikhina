import { RegisterSchema } from '~/shared/types/auth'
import { adminRegister } from '~/server/modules/auth/admin-auth.service'

/**
 * POST /api/auth/register — admin registration. Returns the recovery
 * phrase exactly once.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, RegisterSchema)
  return await adminRegister(body)
})
