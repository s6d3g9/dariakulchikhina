import { useDb } from '~/server/db/index'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

const VisitStatusSchema = z.object({
  visit_status:         z.enum(['scheduled', 'done', 'noshow', 'postponed', 'cancelled']),
  visit_postponed_date: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const projectSlug = getRouterParam(event, 'slug')!
  requireAdminOrClient(event, projectSlug)
  const body = await readValidatedNodeBody(event, VisitStatusSchema)

  const db = useDb()
  const profilePatch = JSON.stringify(body)
  await db.execute(
    sql`UPDATE projects
        SET profile = coalesce(profile, '{}'::jsonb) || ${profilePatch}::jsonb,
            updated_at = now()
        WHERE slug = ${projectSlug}`
  )
  return { ok: true }
})
