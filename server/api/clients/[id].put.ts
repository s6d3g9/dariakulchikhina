import { useDb } from '~/server/db/index'
import { clients } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const UpdateClientSchema = z.object({
  name: z.string().min(1).max(200).transform(s => s.trim()),
  phone: z.string().max(50).nullable().optional().transform(v => v?.trim() || null),
  email: z.string().max(200).nullable().optional().transform(v => v?.trim() || null),
  messenger: z.string().max(100).nullable().optional().transform(v => v?.trim() || null),
  messengerNick: z.string().max(100).nullable().optional().transform(v => v?.trim() || null),
  address: z.string().max(500).nullable().optional().transform(v => v?.trim() || null),
  notes: z.string().max(5000).nullable().optional().transform(v => v?.trim() || null),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedNodeBody(event, UpdateClientSchema)
  const db = useDb()
  const [c] = await db.update(clients).set(body).where(eq(clients.id, id)).returning()
  if (!c) throw createError({ statusCode: 404, statusMessage: 'Client not found' })
  return c
})
