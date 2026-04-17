import type { H3Event } from 'h3'
import {
  getAdminSession,
  setAdminSession,
  getClientSession,
  getContractorSession,
  clearContractorSession,
} from '~/server/utils/auth'
import * as repo from './auth.repository'

/**
 * Role-aware view of the caller's session, returned to `/api/auth/me`.
 * Cookie helpers (get/set/clear*Session) live in `server/utils/auth` and
 * own the HMAC signing; this service owns the role-resolution business logic.
 */
export type SessionView =
  | { role: 'admin'; id: number; email: string; name: string | null }
  | { role: 'client'; projectSlug: string }
  | { role: 'contractor'; contractorId: number }
  | { role: null }

/**
 * Resolve the caller's session by inspecting cookies in the precedence
 * order admin -> client -> contractor. Handles the admin bootstrap-fallback
 * (legacy DESIGNER_INITIAL_EMAIL) and invalidates stale contractor
 * sessions when the row has been deleted.
 */
export async function resolveSession(event: H3Event): Promise<SessionView> {
  const adminSession = getAdminSession(event)
  if (adminSession) {
    const admin = await resolveAdminUser(event, adminSession.userId)
    if (admin) return { role: 'admin', ...admin }
  }

  const clientSlug = getClientSession(event)
  if (clientSlug) return { role: 'client', projectSlug: clientSlug }

  const contractorId = getContractorSession(event)
  if (contractorId) {
    const contractor = await repo.findContractorIdForSession(contractorId)
    if (!contractor) {
      clearContractorSession(event)
      return { role: null }
    }
    return { role: 'contractor', contractorId }
  }

  return { role: null }
}

async function resolveAdminUser(event: H3Event, userId: number) {
  let user = await repo.findUserById(userId)
  if (user) return user

  const fallbackEmail = (
    process.env.DESIGNER_INITIAL_EMAIL || 'admin@dariakulchikhina.com'
  ).trim()
  if (fallbackEmail) {
    user = await repo.findUserByEmail(fallbackEmail)
  }
  if (!user) {
    user = await repo.findFirstUser()
  }
  if (user) setAdminSession(event, user.id)
  return user ?? null
}
