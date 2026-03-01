import { useDb } from '~/server/db/index'
import { clients } from '~/server/db/schema'
import { readNodeBody } from '~/server/utils/body'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readNodeBody(event) as any
  if (!body.name?.trim()) throw createError({ statusCode: 400, statusMessage: 'name required' })
  const db = useDb()
  const [c] = await db.insert(clients).values({
    name: body.name.trim(),
    phone: body.phone?.trim() || null,
    email: body.email?.trim() || null,
    messenger: body.messenger?.trim() || null,
    messengerNick: body.messengerNick?.trim() || null,
    address: body.address?.trim() || null,
    notes: body.notes?.trim() || null,
  }).returning()
  return c
})
