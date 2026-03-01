import { useDb } from '~/server/db/index'
import { contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const Schema = z.object({
  id: z.number().int().positive(),
  slug: z.string().min(1).max(200),
})

export default defineEventHandler(async (event) => {
  const { id, slug } = await readValidatedNodeBody(event, Schema)
  const db = useDb()
  const [contractor] = await db.select().from(contractors).where(eq(contractors.id, id)).limit(1)
  if (!contractor) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  // Verify slug matches — acts as a simple shared secret
  if (contractor.slug !== slug) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }
  setContractorSession(event, contractor.id)
  return { ok: true, id: contractor.id, name: contractor.name }
})
