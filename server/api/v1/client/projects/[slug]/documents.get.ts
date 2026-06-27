import { createHash } from 'node:crypto'
import { eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { documents, projects } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createApiV1ClientProjectDocumentsDto } from '~/server/utils/api-v1-client-documents'
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
      profile: projects.profile,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const documentRows = await db
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
    .orderBy(documents.createdAt)

  const data = createApiV1ClientProjectDocumentsDto({
    ...project,
    profile: (project.profile || {}) as Record<string, unknown>,
  }, documentRows)
  const revisionHash = createHash('sha1')
    .update(JSON.stringify({
      project: data.project,
      facts: data.facts,
      summary: data.summary,
      items: data.items.map(item => ({
        id: item.id,
        kind: item.kind,
        title: item.title,
        url: item.url,
        updatedAt: item.updatedAt,
      })),
    }))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `client-documents:${revisionHash}`,
  })
})
