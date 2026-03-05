import { useDb } from '~/server/db/index'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

const ContactRequestSchema = z.object({
  /** 'asap' или ISO-дата-время слота */
  slot:    z.string().min(1),
  message: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const projectSlug = getRouterParam(event, 'slug')!
  requireAdminOrClient(event, projectSlug)
  const body = await readValidatedNodeBody(event, ContactRequestSchema)

  const patch = JSON.stringify({
    contact_request_slot:   body.slot,
    contact_request_msg:    body.message ?? '',
    contact_request_status: 'pending',
    contact_request_at:     new Date().toISOString(),
  })

  const db = useDb()
  await db.execute(
    sql`UPDATE projects
        SET profile = coalesce(profile, '{}'::jsonb) || ${patch}::jsonb,
            updated_at = now()
        WHERE slug = ${projectSlug}`,
  )

  return { ok: true }
})
