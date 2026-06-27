import { and, eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { documents, projectExtraServices, projects } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createApiV1ClientExtraServiceDocumentDto } from '~/server/utils/api-v1-client-extra-services'
import { requireAdminOrClient } from '~/server/utils/auth'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const kind = getRouterParam(event, 'kind')
  if (kind !== 'contract' && kind !== 'invoice') {
    throw createError({ statusCode: 400, statusMessage: 'Document kind must be contract or invoice' })
  }

  const serviceId = requireIntParam(event, 'id')
  requireAdminOrClient(event, slug)

  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const [service] = await db
    .select({
      id: projectExtraServices.id,
      contractDocId: projectExtraServices.contractDocId,
      invoiceDocId: projectExtraServices.invoiceDocId,
    })
    .from(projectExtraServices)
    .where(and(
      eq(projectExtraServices.id, serviceId),
      eq(projectExtraServices.projectId, project.id),
    ))
    .limit(1)

  if (!service) {
    throw createError({ statusCode: 404, statusMessage: 'Extra service not found' })
  }

  const documentId = kind === 'contract' ? service.contractDocId : service.invoiceDocId
  if (!documentId) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  const [document] = await db
    .select({
      id: documents.id,
      title: documents.title,
      content: documents.content,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(
      eq(documents.id, documentId),
      eq(documents.projectId, project.id),
    ))
    .limit(1)

  if (!document) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  const data = createApiV1ClientExtraServiceDocumentDto(kind, document)

  return createApiV1Envelope(event, data, {
    revision: `extra-service-document:${service.id}:${kind}:${data.generatedAt}`,
  })
})
