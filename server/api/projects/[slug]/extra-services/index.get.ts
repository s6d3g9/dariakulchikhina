import { useDb } from '~/server/db/index'
import { projectExtraServices, projects, documents } from '~/server/db/schema'
import { eq, desc } from 'drizzle-orm'

/**
 * GET /api/projects/[slug]/extra-services
 * Возвращает все доп. услуги проекта (admin + authenticated client).
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const auth = requireAdminOrClient(event, slug)

  const db = useDb()

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) throw createError({ statusCode: 404, message: 'Project not found' })

  const services = await db
    .select()
    .from(projectExtraServices)
    .where(eq(projectExtraServices.projectId, project.id))
    .orderBy(desc(projectExtraServices.createdAt))

  // Для клиента — не показываем adminNotes
  if (auth.role === 'client') {
    return services.map(s => ({ ...s, adminNotes: undefined }))
  }

  return services
})
