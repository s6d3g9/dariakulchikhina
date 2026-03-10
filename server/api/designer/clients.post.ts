import { useDb } from '~/server/db/index'
import { clients } from '~/server/db/schema'
import { z } from 'zod'

const Schema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().optional().nullable(),
  messenger: z.string().optional().nullable(),
  messengerNick: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  requireDesigner(event)
  const body = await readValidatedNodeBody(event, Schema)
  const db = useDb()

  const [client] = await db.insert(clients).values({
    name: body.name,
    phone: body.phone || null,
    email: body.email || null,
    messenger: body.messenger || null,
    messengerNick: body.messengerNick || null,
    address: body.address || null,
    notes: body.notes || null,
    brief: {},
  }).returning()

  return client
})
