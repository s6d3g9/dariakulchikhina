import { useDb } from '~/server/db/index'
import { clients } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { readNodeBody } from '~/server/utils/body'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readNodeBody(event) as any
  if (!body.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'name required' })
  const db = useDb()
  const [c] = await db.update(clients).set({
    name: body.name.trim(),
    phone: body.phone?.trim() || null,
    email: body.email?.trim() || null,
    messenger: body.messenger?.trim() || null,
    messengerNick: body.messengerNick?.trim() || null,
    address: body.address?.trim() || null,
    notes: body.notes?.trim() || null,
    ...(body.pin?.trim() && { pin: body.pin.trim() }),
  }).where(eq(clients.id, id)).returning()
  if (!c) throw createError({ statusCode: 404, statusMessage: 'Client not found' })
  return c
})
