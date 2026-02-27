import { useDb } from '~/server/db/index'
import { clients } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Accessible by the client themselves or admin
  const clientIdSession = getClientIdSession(event)
  const adminSession = getAdminSession(event)
  if (!clientIdSession && !adminSession)
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const id = Number(getRouterParam(event, 'id'))
  if (clientIdSession && clientIdSession !== id)
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const db = useDb()
  const [client] = await db.select({
    id: clients.id,
    name: clients.name,
    phone: clients.phone,
    email: clients.email,
    brief: clients.brief,
  }).from(clients).where(eq(clients.id, id)).limit(1)

  if (!client) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return client
})
