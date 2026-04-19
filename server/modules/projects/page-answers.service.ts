import { z } from 'zod'
import * as repo from '~/server/modules/projects/project-pages.repository'

const ANSWERS_PREFIX = '__answers__:'

async function resolveProjectId(slug: string): Promise<number> {
  const id = await repo.findProjectIdBySlug(slug)
  if (id === null) throw createError({ statusCode: 404 })
  return id
}

export const PageAnswersSchema = z.object({
  pageSlug: z.string().min(1),
  selections: z.record(z.union([z.boolean(), z.number()])).default({}),
  textAnswers: z.record(z.string()).default({}),
  numberAnswers: z.record(z.union([z.number(), z.string()])).default({}),
})
export type PageAnswersInput = z.infer<typeof PageAnswersSchema>

interface AnswersPayload {
  pageSlug: string
  selections: Record<string, boolean | number>
  textAnswers: Record<string, string>
  numberAnswers: Record<string, number>
}

/**
 * Page-answers are stored in the same `page_content` table under a
 * namespaced slug `__answers__:<pageSlug>`. This keeps all project-scoped
 * JSONB in one place but lets the UI query answers without loading the
 * full page-content row.
 */
export async function getPageAnswers(
  slug: string,
  rawPage: string | undefined,
): Promise<AnswersPayload> {
  const page = (rawPage || '').trim()
  if (!page) {
    throw createError({ statusCode: 400, statusMessage: 'Missing page' })
  }

  const projectId = await resolveProjectId(slug)
  const storageSlug = `${ANSWERS_PREFIX}${page}`
  const row = await repo.findPageContent(projectId, storageSlug)

  const content = (row?.content || {}) as Record<string, unknown>

  return {
    pageSlug: page,
    selections: (content.selections as Record<string, boolean | number>) || {},
    textAnswers: (content.textAnswers as Record<string, string>) || {},
    numberAnswers: (content.numberAnswers as Record<string, number>) || {},
  }
}

export async function upsertPageAnswers(slug: string, body: PageAnswersInput) {
  const projectId = await resolveProjectId(slug)

  const normalizedNumberAnswers = Object.fromEntries(
    Object.entries(body.numberAnswers).map(([key, value]) => [
      key,
      Math.max(0, Number(value) || 0),
    ]),
  )

  const storageSlug = `${ANSWERS_PREFIX}${body.pageSlug}`
  const content = {
    selections: body.selections,
    textAnswers: body.textAnswers,
    numberAnswers: normalizedNumberAnswers,
  }

  const existing = await repo.findPageContentId(projectId, storageSlug)

  if (existing) {
    return repo.updatePageContent(projectId, storageSlug, content)
  }

  return repo.insertPageContent({ projectId, pageSlug: storageSlug, content })
}
