import { z } from 'zod'
import * as repo from '~/server/modules/projects/project-pages.repository'

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function sanitizeContent(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (DANGEROUS_KEYS.has(k)) continue
    clean[k] =
      v && typeof v === 'object' && !Array.isArray(v)
        ? sanitizeContent(v as Record<string, unknown>)
        : v
  }
  return clean
}

async function resolveProjectId(slug: string): Promise<number> {
  const id = await repo.findProjectIdBySlug(slug)
  if (id === null) throw createError({ statusCode: 404 })
  return id
}

export const UpsertPageContentSchema = z.object({
  pageSlug: z.string().min(1).max(200),
  content: z.record(z.unknown()),
})
export type UpsertPageContentInput = z.infer<typeof UpsertPageContentSchema>

/**
 * Fetch page-content for a project. Without `page`, returns all rows;
 * with `page`, returns the row for that slug or a synthetic empty
 * placeholder so the UI can render without a null-check.
 */
export async function getPageContent(slug: string, page: string | undefined) {
  const projectId = await resolveProjectId(slug)

  if (page) {
    const content = await repo.findPageContent(projectId, page)
    return content || { projectId, pageSlug: page, content: {} }
  }

  return repo.listPageContent(projectId)
}

/**
 * Upsert page-content for a project. Sanitizes the content payload
 * against prototype-pollution keys before writing.
 */
export async function upsertPageContent(slug: string, body: UpsertPageContentInput) {
  const projectId = await resolveProjectId(slug)
  const safeContent = sanitizeContent(body.content as Record<string, unknown>)

  const existing = await repo.findPageContentId(projectId, body.pageSlug)

  if (existing) {
    return repo.updatePageContent(projectId, body.pageSlug, safeContent)
  }

  return repo.insertPageContent({ projectId, pageSlug: body.pageSlug, content: safeContent })
}
