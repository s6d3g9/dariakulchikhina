import { useDb } from '~/server/db/index'
import { sql } from 'drizzle-orm'
import { z } from 'zod'

const VisitRatingSchema = z.object({
  visit_rating:  z.number().int().min(1).max(5),
  visit_comment: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const projectSlug = getRouterParam(event, 'slug')!
  requireAdminOrClient(event, projectSlug)
  const body = await readValidatedNodeBody(event, VisitRatingSchema)

  const patch = JSON.stringify({
    visit_rating:     body.visit_rating,
    visit_comment:    body.visit_comment ?? '',
    visit_rated_at:   new Date().toISOString(),
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
