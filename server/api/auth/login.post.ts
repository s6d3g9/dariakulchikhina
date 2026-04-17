import { LoginSchema } from '~/shared/types/auth'
import { adminLogin } from '~/server/modules/auth/admin-auth.service'

/**
 * POST /api/auth/login — admin (designer) login. Sets the admin session
 * cookie on success.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, LoginSchema)
  return await adminLogin(event, body)
})
