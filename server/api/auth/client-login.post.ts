import {
  clientLogin,
  ClientLoginSchema,
} from '~/server/modules/auth/client-auth.service'

/**
 * POST /api/auth/client-login — slug-based or credential-based client
 * login. Sets the client session cookie on success.
 */
export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, ClientLoginSchema)
  return await clientLogin(event, body)
})
