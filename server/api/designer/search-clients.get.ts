import { useDb } from '~/server/db/index'
import { clients } from '~/server/db/schema'
import { ilike, or } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireDesigner(event)
  const q = (getQuery(event).q as string || '').trim()
  const db = useDb()

  if (!q || q.length < 2) return []

  const pattern = `%${q}%`
  const rows = await db
    .select({ id: clients.id, name: clients.name, phone: clients.phone, email: clients.email })
    .from(clients)
    .where(or(ilike(clients.name, pattern), ilike(clients.phone, pattern), ilike(clients.email, pattern)))
    .limit(20)

  return rows
})
