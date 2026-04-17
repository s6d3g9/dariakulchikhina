import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { pageContent, projects } from '~/server/db/schema'

const ANSWERS_PREFIX = '__answers__:'

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Strip prototype-pollution keys from a deep object literal. */
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
  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  if (!project) throw createError({ statusCode: 404 })
  return project.id
}

// ── page-content ──────────────────────────────────────────────────────

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
  const db = useDb()

  if (page) {
    const [content] = await db
      .select()
      .from(pageContent)
      .where(and(eq(pageContent.projectId, projectId), eq(pageContent.pageSlug, page)))
      .limit(1)
    return content || { projectId, pageSlug: page, content: {} }
  }

  return db.select().from(pageContent).where(eq(pageContent.projectId, projectId))
}

/**
 * Upsert page-content for a project. Sanitizes the content payload
 * against prototype-pollution keys before writing.
 */
export async function upsertPageContent(slug: string, body: UpsertPageContentInput) {
  const projectId = await resolveProjectId(slug)
  const db = useDb()
  const safeContent = sanitizeContent(body.content as Record<string, unknown>)

  const existing = await db
    .select({ id: pageContent.id })
    .from(pageContent)
    .where(
      and(eq(pageContent.projectId, projectId), eq(pageContent.pageSlug, body.pageSlug)),
    )
    .limit(1)

  if (existing.length > 0) {
    const [updated] = await db
      .update(pageContent)
      .set({ content: safeContent, updatedAt: new Date() })
      .where(
        and(
          eq(pageContent.projectId, projectId),
          eq(pageContent.pageSlug, body.pageSlug),
        ),
      )
      .returning()
    return updated
  }

  const [inserted] = await db
    .insert(pageContent)
    .values({ projectId, pageSlug: body.pageSlug, content: safeContent })
    .returning()
  return inserted
}

// ── page-answers ──────────────────────────────────────────────────────

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
  const db = useDb()

  const storageSlug = `${ANSWERS_PREFIX}${page}`
  const [row] = await db
    .select({ content: pageContent.content })
    .from(pageContent)
    .where(
      and(
        eq(pageContent.projectId, projectId),
        eq(pageContent.pageSlug, storageSlug),
      ),
    )
    .limit(1)

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
  const db = useDb()

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

  const existing = await db
    .select({ id: pageContent.id })
    .from(pageContent)
    .where(
      and(eq(pageContent.projectId, projectId), eq(pageContent.pageSlug, storageSlug)),
    )
    .limit(1)

  if (existing.length > 0) {
    const [updated] = await db
      .update(pageContent)
      .set({ content, updatedAt: new Date() })
      .where(
        and(
          eq(pageContent.projectId, projectId),
          eq(pageContent.pageSlug, storageSlug),
        ),
      )
      .returning()
    return updated
  }

  const [inserted] = await db
    .insert(pageContent)
    .values({ projectId, pageSlug: storageSlug, content })
    .returning()
  return inserted
}
