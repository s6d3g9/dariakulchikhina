import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { PROJECT_STATUSES } from '~/shared/types/catalogs'

const Body = z.object({
  status: z.enum(PROJECT_STATUSES),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, Body)
  const db = useDb()

  const [updated] = await db
    .update(projects)
    .set({ status: body.status, updatedAt: new Date() })
    .where(eq(projects.slug, slug))
    .returning()

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  return updated
})
