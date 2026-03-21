import { useDb } from '~/server/db/index'
import { projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { UpdateProjectSchema } from '~/shared/types/project'

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

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, UpdateProjectSchema)

  const db = useDb()
  const [updated] = await db.update(projects)
    .set({ ...body, updatedAt: new Date() } as any)
    .where(eq(projects.slug, slug))
    .returning(projectReturning)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  return updated
})
