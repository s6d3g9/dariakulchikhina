import { createHash } from 'node:crypto'
import { desc, eq, inArray } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { documents, projectExtraServices, projects } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createApiV1ClientProjectExtraServicesDto } from '~/server/utils/api-v1-client-extra-services'
import { requireAdminOrClient } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  requireAdminOrClient(event, slug)

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

  const services = await db
    .select({
      id: projectExtraServices.id,
      requestedBy: projectExtraServices.requestedBy,
      serviceKey: projectExtraServices.serviceKey,
      title: projectExtraServices.title,
      description: projectExtraServices.description,
      quantity: projectExtraServices.quantity,
      unit: projectExtraServices.unit,
      unitPrice: projectExtraServices.unitPrice,
      totalPrice: projectExtraServices.totalPrice,
      status: projectExtraServices.status,
      clientNotes: projectExtraServices.clientNotes,
      contractDocId: projectExtraServices.contractDocId,
      invoiceDocId: projectExtraServices.invoiceDocId,
      createdAt: projectExtraServices.createdAt,
      updatedAt: projectExtraServices.updatedAt,
    })
    .from(projectExtraServices)
    .where(eq(projectExtraServices.projectId, project.id))
    .orderBy(desc(projectExtraServices.createdAt))

  const documentIds = Array.from(new Set(services.flatMap(service => [
    service.contractDocId,
    service.invoiceDocId,
  ]).filter((id): id is number => typeof id === 'number')))

  const serviceDocuments = documentIds.length
    ? await db
      .select({
        id: documents.id,
        title: documents.title,
        content: documents.content,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(inArray(documents.id, documentIds))
    : []

  const data = createApiV1ClientProjectExtraServicesDto(project, services, serviceDocuments)
  const revisionHash = createHash('sha1')
    .update(JSON.stringify(data.items.map(item => ({
      id: item.id,
      status: item.status,
      totalPrice: item.totalPrice,
      updatedAt: item.updatedAt,
      documents: item.documents,
    }))))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `extra-services:${revisionHash}`,
  })
})
