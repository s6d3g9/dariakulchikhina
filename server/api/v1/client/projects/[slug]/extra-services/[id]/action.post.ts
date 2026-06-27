import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { useDb } from '~/server/db'
import { projectExtraServices, projects } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createApiV1ClientProjectExtraServicesDto } from '~/server/utils/api-v1-client-extra-services'
import { requireAdminOrClient } from '~/server/utils/auth'
import { requireIntParam } from '~/server/utils/query'

const ExtraServiceActionSchema = z.object({
  action: z.enum(['approve', 'cancel']),
  clientNotes: z.string().max(5000).optional(),
})

const CLIENT_CANCELLABLE_STATUSES = ['requested', 'quoted', 'approved', 'contract_sent']

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const serviceId = requireIntParam(event, 'id')
  requireAdminOrClient(event, slug)

  const body = await readValidatedNodeBody(event, ExtraServiceActionSchema)
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const [service] = await db
    .select()
    .from(projectExtraServices)
    .where(and(
      eq(projectExtraServices.id, serviceId),
      eq(projectExtraServices.projectId, project.id),
    ))
    .limit(1)

  if (!service) {
    throw createError({ statusCode: 404, statusMessage: 'Extra service not found' })
  }

  const update: Partial<typeof projectExtraServices.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (body.clientNotes !== undefined) {
    update.clientNotes = body.clientNotes.trim() || null
  }

  if (body.action === 'approve') {
    if (service.status !== 'quoted') {
      throw createError({ statusCode: 409, statusMessage: 'Only quoted services can be approved by client' })
    }
    update.status = 'approved'
  } else {
    if (!CLIENT_CANCELLABLE_STATUSES.includes(service.status)) {
      throw createError({ statusCode: 409, statusMessage: 'This service can no longer be cancelled by client' })
    }
    update.status = 'cancelled'
  }

  const [updated] = await db
    .update(projectExtraServices)
    .set(update)
    .where(eq(projectExtraServices.id, serviceId))
    .returning()

  const data = createApiV1ClientProjectExtraServicesDto(project, [updated], [])

  return createApiV1Envelope(event, data.items[0], {
    revision: `extra-service:${updated.id}:${updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : updated.updatedAt}`,
  })
})
