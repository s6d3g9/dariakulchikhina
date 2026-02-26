import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { UpdateProjectSchema } from '~/shared/types/project'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, UpdateProjectSchema)
  const db = useDb()
  const [updated] = await db.update(projects)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(projects.slug, slug))
    .returning()
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  return updated
})
