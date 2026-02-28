import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const Schema = z.object({ id: z.number().int().positive() })

export default defineEventHandler(async (event) => {
  const { id } = await readValidatedNodeBody(event, Schema)
  const db = useDb()
  const [contractor] = await db.select().from(contractors).where(eq(contractors.id, id)).limit(1)
  if (!contractor) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  setContractorSession(event, contractor.id)
  return { ok: true, id: contractor.id, name: contractor.name }
})
