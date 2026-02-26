import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { PinLoginSchema } from '~/shared/types/auth'

export default defineEventHandler(async (event) => {
  const body = await readValidatedNodeBody(event, PinLoginSchema)
  const db = useDb()
  const all = await db.select().from(contractors)
  const contractor = all.find(c => c.pin && c.pin === body.pin)
  if (!contractor) throw createError({ statusCode: 401, statusMessage: 'Wrong PIN' })
  setContractorSession(event, contractor.id)
  return { ok: true, id: contractor.id, name: contractor.name }
})
