import { createHash } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { documents, projectExtraServices, projects } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createApiV1ClientProjectApprovalsDto } from '~/server/utils/api-v1-client-approvals'
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
      pages: projects.pages,
      profile: projects.profile,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const [documentRows, serviceRows] = await Promise.all([
    db
      .select({
        id: documents.id,
        category: documents.category,
        title: documents.title,
        filename: documents.filename,
        url: documents.url,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .where(eq(documents.projectId, project.id))
      .orderBy(desc(documents.createdAt)),
    db
      .select({
        id: projectExtraServices.id,
        requestedBy: projectExtraServices.requestedBy,
        title: projectExtraServices.title,
        description: projectExtraServices.description,
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
      .orderBy(desc(projectExtraServices.updatedAt)),
  ])

  const data = createApiV1ClientProjectApprovalsDto({
    ...project,
    profile: (project.profile || {}) as Record<string, unknown>,
  }, documentRows, serviceRows)
  const revisionHash = createHash('sha1')
    .update(JSON.stringify({
      project: data.project,
      summary: data.summary,
      pending: data.pending.map(item => ({
        id: item.id,
        awaiting: item.awaiting,
        dueDate: item.dueDate,
        status: item.status,
      })),
      history: data.history.map(item => ({
        id: item.id,
        decision: item.decision,
        decidedAt: item.decidedAt,
        revision: item.revision,
      })),
    }))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `client-approvals:${revisionHash}`,
  })
})
