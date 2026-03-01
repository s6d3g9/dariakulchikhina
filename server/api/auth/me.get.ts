import { useDb } from '~/server/db/index'
import { users } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const adminSession = getAdminSession(event)
  if (adminSession) {
    const db = useDb()
    let [user] = await db.select({ id: users.id, email: users.email, name: users.name })
      .from(users).where(eq(users.id, adminSession.userId)).limit(1)
    if (!user) {
      const preferredEmail = (process.env.DESIGNER_INITIAL_EMAIL || 'admin@dariakulchikhina.com').trim()
      if (preferredEmail) {
        ;[user] = await db.select({ id: users.id, email: users.email, name: users.name })
          .from(users).where(eq(users.email, preferredEmail)).limit(1)
      }
      if (!user) {
        ;[user] = await db.select({ id: users.id, email: users.email, name: users.name })
          .from(users).limit(1)
      }
      if (user) setAdminSession(event, user.id)
    }
    if (user) return { role: 'designer', ...user }
  }
  const clientSlug = getClientSession(event)
  if (clientSlug) return { role: 'client', projectSlug: clientSlug }
  const contractorId = getContractorSession(event)
  if (contractorId) return { role: 'contractor', contractorId }
  return { role: null }
})
