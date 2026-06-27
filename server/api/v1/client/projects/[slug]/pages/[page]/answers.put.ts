import { createHash } from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

import { useDb } from '~/server/db'
import { pageContent, projects } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import {
  API_V1_CLIENT_PAGE_ANSWERS_PREFIX,
  canReadApiV1ClientProjectPage,
  createApiV1ClientProjectPageDto,
  normalizeApiV1ClientPageSlug,
  sanitizeApiV1ClientPageAnswers,
} from '~/server/utils/api-v1-client-page-content'
import { requireAdminOrClient } from '~/server/utils/auth'

const Body = z.object({
  selections: z.record(z.string().max(200), z.union([z.boolean(), z.number()])).default({}),
  textAnswers: z.record(z.string().max(200), z.string().max(10_000)).default({}),
  numberAnswers: z.record(z.string().max(200), z.union([z.number(), z.string().max(100)])).default({}),
})

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

  const body = await readValidatedNodeBody(event, Body)
  const answers = sanitizeApiV1ClientPageAnswers(pageSlug, body)
  const answersContent = {
    selections: answers.selections,
    textAnswers: answers.textAnswers,
    numberAnswers: answers.numberAnswers,
  }

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
  const [existingAnswers] = await db
    .select({ id: pageContent.id })
    .from(pageContent)
    .where(and(
      eq(pageContent.projectId, project.id),
      eq(pageContent.pageSlug, answersSlug),
    ))
    .limit(1)

  const [answersRow] = existingAnswers
    ? await db
      .update(pageContent)
      .set({ content: answersContent, updatedAt: new Date() })
      .where(and(
        eq(pageContent.projectId, project.id),
        eq(pageContent.pageSlug, answersSlug),
      ))
      .returning({
        content: pageContent.content,
        updatedAt: pageContent.updatedAt,
      })
    : await db
      .insert(pageContent)
      .values({
        projectId: project.id,
        pageSlug: answersSlug,
        content: answersContent,
      })
      .returning({
        content: pageContent.content,
        updatedAt: pageContent.updatedAt,
      })

  const [contentRow] = await db
    .select({
      content: pageContent.content,
      updatedAt: pageContent.updatedAt,
    })
    .from(pageContent)
    .where(and(
      eq(pageContent.projectId, project.id),
      eq(pageContent.pageSlug, pageSlug),
    ))
    .limit(1)

  const data = createApiV1ClientProjectPageDto(
    project,
    pageSlug,
    contentRow || null,
    answersRow || null,
  )
  const revisionHash = createHash('sha1')
    .update(JSON.stringify({
      page: data.page,
      answers: data.answers,
    }))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `client-page-answers:${revisionHash}`,
  })
})
