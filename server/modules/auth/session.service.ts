import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { contractors, users } from '~/server/db/schema'
import {
  getAdminSession,
  setAdminSession,
  getClientSession,
  getContractorSession,
  clearContractorSession,
} from '~/server/utils/auth'

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
 * order admin → client → contractor. Handles the admin bootstrap-fallback
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
    const db = useDb()
    const [contractor] = await db
      .select({ id: contractors.id })
      .from(contractors)
      .where(eq(contractors.id, contractorId))
      .limit(1)
    if (!contractor) {
      clearContractorSession(event)
      return { role: null }
    }
    return { role: 'contractor', contractorId }
  }

  return { role: null }
}

async function resolveAdminUser(event: H3Event, userId: number) {
  const db = useDb()
  const columns = { id: users.id, email: users.email, name: users.name }

  let [user] = await db.select(columns).from(users).where(eq(users.id, userId)).limit(1)
  if (user) return user

  const fallbackEmail = (
    process.env.DESIGNER_INITIAL_EMAIL || 'admin@dariakulchikhina.com'
  ).trim()
  if (fallbackEmail) {
    ;[user] = await db
      .select(columns)
      .from(users)
      .where(eq(users.email, fallbackEmail))
      .limit(1)
  }
  if (!user) {
    ;[user] = await db.select(columns).from(users).limit(1)
  }
  if (user) setAdminSession(event, user.id)
  return user ?? null
}
