import { useDb } from '~/server/db/index'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

const VisitDataSchema = z.object({
  visit_contractor_name: z.string().optional(),
  visit_date:            z.string().optional(),
  visit_time:            z.string().optional(),
  visit_services:        z.string().optional(),
  visit_status:          z.string().optional(),
  visit_postponed_date:  z.string().optional(),
  contract_total:        z.string().optional(),
  contract_paid:         z.string().optional(),
  follow_up_date:        z.string().optional(),
  follow_up_note:        z.string().optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const projectSlug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, VisitDataSchema)

  const db = useDb()
  const profilePatch = JSON.stringify(body)
  const rows = await db.execute(
    sql`UPDATE projects
        SET profile = coalesce(profile, '{}'::jsonb) || ${profilePatch}::jsonb,
            updated_at = now()
        WHERE slug = ${projectSlug}
        RETURNING *`
  )
  const updated = (rows as any).rows?.[0] ?? (rows as any)[0]
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  return updated
})
