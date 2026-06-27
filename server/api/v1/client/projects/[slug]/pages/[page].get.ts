import { createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { pageContent, projects } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import {
  API_V1_CLIENT_PAGE_ANSWERS_PREFIX,
  canReadApiV1ClientProjectPage,
  createApiV1ClientProjectPageDto,
  normalizeApiV1ClientPageSlug,
} from '~/server/utils/api-v1-client-page-content'
import { requireAdminOrClient } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const pageSlug = normalizeApiV1ClientPageSlug(getRouterParam(event, 'page'))

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }
  if (!pageSlug) {
    throw createError({ statusCode: 400, statusMessage: 'Project page is required' })
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
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project || !canReadApiV1ClientProjectPage(project, pageSlug)) {
    throw createError({ statusCode: 404, statusMessage: 'Project page not found' })
  }

  const answersSlug = `${API_V1_CLIENT_PAGE_ANSWERS_PREFIX}${pageSlug}`
  const rows = await db
    .select({
      pageSlug: pageContent.pageSlug,
      content: pageContent.content,
      updatedAt: pageContent.updatedAt,
    })
    .from(pageContent)
    .where(and(
      eq(pageContent.projectId, project.id),
      eq(pageContent.pageSlug, pageSlug),
    ))
    .limit(1)

  const answerRows = await db
    .select({
      content: pageContent.content,
      updatedAt: pageContent.updatedAt,
    })
    .from(pageContent)
    .where(and(
      eq(pageContent.projectId, project.id),
      eq(pageContent.pageSlug, answersSlug),
    ))
    .limit(1)

  const data = createApiV1ClientProjectPageDto(
    project,
    pageSlug,
    rows[0] || null,
    answerRows[0] || null,
  )
  const revisionHash = createHash('sha1')
    .update(JSON.stringify({
      page: data.page,
      content: data.content,
      answers: data.answers,
    }))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `client-page:${revisionHash}`,
  })
})
