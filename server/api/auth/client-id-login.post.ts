import { useDb } from '~/server/db/index'
import { clients } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { readNodeBody } from '~/server/utils/body'

export default defineEventHandler(async (event) => {
  const body = await readNodeBody(event) as any
  const id = Number(body.clientId)
  const pin = String(body.pin || '').trim()

  if (!id || !pin) throw createError({ statusCode: 400, statusMessage: 'clientId и pin обязательны' })

  const db = useDb()
  const [client] = await db.select().from(clients).where(eq(clients.id, id)).limit(1)

  if (!client) throw createError({ statusCode: 404, statusMessage: 'Клиент не найден' })
  if (!client.pin || client.pin !== pin)
    throw createError({ statusCode: 401, statusMessage: 'Неверный PIN' })

  setClientIdSession(event, client.id)
  return { ok: true, clientId: client.id, name: client.name }
})
