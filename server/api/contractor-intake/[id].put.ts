import { useDb } from '~/server/db/index'
import { contractorIntakes } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const BodySchema = z.object({
  status: z.enum(['new', 'reviewed', 'added', 'rejected']),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readValidatedNodeBody(event, BodySchema)
  const db   = useDb()

  const [row] = await db.update(contractorIntakes)
    .set({ status: body.status })
    .where(eq(contractorIntakes.id, id))
    .returning()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return row
})
