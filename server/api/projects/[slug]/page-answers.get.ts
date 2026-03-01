import { useDb } from '~/server/db/index'
import { pageContent, projects } from '~/server/db/schema'
import { and, eq } from 'drizzle-orm'

const ANSWERS_PREFIX = '__answers__:'

type AnswersPayload = {
  pageSlug: string
  selections: Record<string, boolean | number>
  textAnswers: Record<string, string>
  numberAnswers: Record<string, number>
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  // Auth: admin or client for this project
  requireAdminOrClient(event, slug)
  const rawUrl = event.node.req.url || ''
  const queryString = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : ''
  const rawPage = new URLSearchParams(queryString).get('page') || undefined
  const page = (rawPage || '').trim()
  if (!page) {
    throw createError({ statusCode: 400, statusMessage: 'Missing page' })
  }

  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const storageSlug = `${ANSWERS_PREFIX}${page}`
  const [row] = await db
    .select({ content: pageContent.content })
    .from(pageContent)
    .where(and(eq(pageContent.projectId, project.id), eq(pageContent.pageSlug, storageSlug)))
    .limit(1)

  const content = (row?.content || {}) as Record<string, unknown>

  const payload: AnswersPayload = {
    pageSlug: page,
    selections: (content.selections as Record<string, boolean | number>) || {},
    textAnswers: (content.textAnswers as Record<string, string>) || {},
    numberAnswers: (content.numberAnswers as Record<string, number>) || {},
  }

  return payload
})
