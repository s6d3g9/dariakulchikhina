import { useDb } from '~/server/db/index'
import { users, designers } from '~/server/db/schema'
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
  const designerId = getDesignerSession(event)
  if (designerId) {
    const db = useDb()
    const [designer] = await db.select({ id: designers.id, name: designers.name, email: designers.email })
      .from(designers).where(eq(designers.id, designerId)).limit(1)
    if (designer) return { role: 'designer_lk', designerId, name: designer.name, email: designer.email }
  }
  return { role: null }
})
