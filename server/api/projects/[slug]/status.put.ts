import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { PROJECT_STATUSES } from '~/shared/types/catalogs'

const projectReturning = {
  id: projects.id,
  slug: projects.slug,
  title: projects.title,
  status: projects.status,
  projectType: projects.projectType,
  userId: projects.userId,
  pages: projects.pages,
  profile: projects.profile,
  createdAt: projects.createdAt,
  updatedAt: projects.updatedAt,
}

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
    .returning(projectReturning)

  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  return updated
})
