import { useDb } from '~/server/db/index'
import { clients } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { readNodeBody } from '~/server/utils/body'

export default defineEventHandler(async (event) => {
  const clientIdSession = getClientIdSession(event)
  const adminSession = getAdminSession(event)
  if (!clientIdSession && !adminSession)
    throw createError({ statusCode: 401, statusMessage: 'Not authenticated' })

  const id = Number(getRouterParam(event, 'id'))
  if (clientIdSession && clientIdSession !== id)
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  const body = await readNodeBody(event) as any

  const db = useDb()
  const [updated] = await db.update(clients)
    .set({ brief: body })
    .where(eq(clients.id, id))
    .returning({ id: clients.id, brief: clients.brief })

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return updated
})
