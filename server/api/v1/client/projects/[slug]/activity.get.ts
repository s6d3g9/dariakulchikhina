import { createHash } from 'node:crypto'
import { desc, eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { contractors, documents, projectExtraServices, projects, workStatusItemComments, workStatusItems } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import {
  createApiV1ProjectActivityDto,
  type ApiV1ProjectActivityDocumentRow,
  type ApiV1ProjectActivityExtraServiceRow,
  type ApiV1ProjectActivityProjectRow,
  type ApiV1ProjectActivityWorkCommentRow,
} from '~/server/utils/api-v1-project-activity'
import { requireAdminOrClient } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  requireAdminOrClient(event, slug)

  const query = safeGetQuery(event)
  const limit = Number(query.limit || 50)
  const offset = Number(query.offset || 0)
  const db = useDb()
  const [project] = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      profile: projects.profile,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const [documentRows, serviceRows, commentRows] = await Promise.all([
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
      .orderBy(desc(documents.createdAt))
      .limit(200),
    db
      .select({
        id: projectExtraServices.id,
        requestedBy: projectExtraServices.requestedBy,
        title: projectExtraServices.title,
        description: projectExtraServices.description,
        status: projectExtraServices.status,
        clientNotes: projectExtraServices.clientNotes,
        createdAt: projectExtraServices.createdAt,
        updatedAt: projectExtraServices.updatedAt,
      })
      .from(projectExtraServices)
      .where(eq(projectExtraServices.projectId, project.id))
      .orderBy(desc(projectExtraServices.updatedAt))
      .limit(200),
    db
      .select({
        id: workStatusItemComments.id,
        itemId: workStatusItemComments.itemId,
        authorType: workStatusItemComments.authorType,
        authorName: workStatusItemComments.authorName,
        text: workStatusItemComments.text,
        createdAt: workStatusItemComments.createdAt,
        taskTitle: workStatusItems.title,
        taskStatus: workStatusItems.status,
        contractorName: contractors.name,
        contractorCompanyName: contractors.companyName,
      })
      .from(workStatusItemComments)
      .innerJoin(workStatusItems, eq(workStatusItems.id, workStatusItemComments.itemId))
      .leftJoin(contractors, eq(contractors.id, workStatusItems.contractorId))
      .where(eq(workStatusItems.projectId, project.id))
      .orderBy(desc(workStatusItemComments.createdAt))
      .limit(300),
  ])

  const data = createApiV1ProjectActivityDto({
    project: {
      ...project,
      profile: (project.profile || {}) as Record<string, unknown>,
    } as ApiV1ProjectActivityProjectRow,
    documents: documentRows as ApiV1ProjectActivityDocumentRow[],
    extraServices: serviceRows as ApiV1ProjectActivityExtraServiceRow[],
    workComments: commentRows as ApiV1ProjectActivityWorkCommentRow[],
    audience: 'client',
    filters: { limit, offset },
  })
  const revisionHash = createHash('sha1')
    .update(JSON.stringify(data.items.map(item => ({
      id: item.id,
      kind: item.kind,
      occurredAt: item.occurredAt,
      source: item.source,
    }))))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `project-activity:${project.slug}:client:${revisionHash}`,
  })
})
