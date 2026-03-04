import { useDb } from '~/server/db/index'
import { projectExtraServices, projects } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * DELETE /api/projects/[slug]/extra-services/[id]
 * Удаляет запись. Клиент может удалить только свои запросы в статусе requested.
 * Дизайнер (admin) может удалить любую запись.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const serviceId = Number(getRouterParam(event, 'id'))
  const auth = requireAdminOrClient(event, slug)

  if (!Number.isFinite(serviceId)) {
    throw createError({ statusCode: 400, message: 'Invalid service id' })
  }

  const db = useDb()

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  if (!project) throw createError({ statusCode: 404, message: 'Project not found' })

  const [service] = await db
    .select()
    .from(projectExtraServices)
    .where(and(
      eq(projectExtraServices.id, serviceId),
      eq(projectExtraServices.projectId, project.id),
    ))
    .limit(1)
  if (!service) throw createError({ statusCode: 404, message: 'Service not found' })

  if (auth.role === 'client') {
    // Клиент удаляет только свои запросы в начальном статусе
    if (service.requestedBy !== 'client') {
      throw createError({ statusCode: 403, message: 'Cannot delete admin-initiated service' })
    }
    if (!['requested', 'cancelled'].includes(service.status)) {
      throw createError({ statusCode: 403, message: 'Can only delete services in requested or cancelled status' })
    }
  }

  await db
    .delete(projectExtraServices)
    .where(eq(projectExtraServices.id, serviceId))

  return { ok: true }
})
