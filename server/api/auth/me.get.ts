import { resolveSession } from '~/server/modules/auth/session.service'

/**
 * GET /api/auth/me — current session status for the caller.
 * Returns role + identity, or `{ role: null }` when no valid session exists.
 */
export default defineEventHandler(async (event) => {
  return await resolveSession(event)
})
