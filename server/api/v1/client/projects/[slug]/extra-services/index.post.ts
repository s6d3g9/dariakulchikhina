import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { useDb } from '~/server/db'
import { projectExtraServices, projects } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createApiV1ClientProjectExtraServicesDto } from '~/server/utils/api-v1-client-extra-services'
import { requireAdminOrClient } from '~/server/utils/auth'

const CreateExtraServiceRequestSchema = z.object({
  serviceKey: z.string().max(200).optional(),
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  quantity: z.string().max(100).optional(),
  unit: z.string().max(100).optional(),
  clientNotes: z.string().max(5000).optional(),
})

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  requireAdminOrClient(event, slug)

  const body = await readValidatedNodeBody(event, CreateExtraServiceRequestSchema)
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

  const [created] = await db
    .insert(projectExtraServices)
    .values({
      projectId: project.id,
      requestedBy: 'client',
      serviceKey: body.serviceKey?.trim() || null,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      quantity: body.quantity?.trim() || '1',
      unit: body.unit?.trim() || 'услуга',
      status: 'requested',
      clientNotes: body.clientNotes?.trim() || null,
    })
    .returning()

  const data = createApiV1ClientProjectExtraServicesDto(project, [created], [])

  return createApiV1Envelope(event, data.items[0], {
    revision: `extra-service:${created.id}:${created.updatedAt instanceof Date ? created.updatedAt.toISOString() : created.updatedAt}`,
  })
})
