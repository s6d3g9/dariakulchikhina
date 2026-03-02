import { useDb } from '~/server/db/index'
import { pageContent, projects } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/** Strip prototype-pollution keys from an object recursively */
function sanitizeContent(obj: Record<string, unknown>): Record<string, unknown> {
  const clean: Record<string, unknown> = Object.create(null)
  for (const [k, v] of Object.entries(obj)) {
    if (DANGEROUS_KEYS.has(k)) continue
    clean[k] = v && typeof v === 'object' && !Array.isArray(v)
      ? sanitizeContent(v as Record<string, unknown>)
      : v
  }
  return clean
}

const Body = z.object({ pageSlug: z.string().min(1).max(200), content: z.record(z.unknown()) })

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, Body)
  const safeContent = sanitizeContent(body.content as Record<string, unknown>)
  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404 })
  const existing = await db.select({ id: pageContent.id }).from(pageContent)
    .where(and(eq(pageContent.projectId, project.id), eq(pageContent.pageSlug, body.pageSlug))).limit(1)
  if (existing.length > 0) {
    const [updated] = await db.update(pageContent)
      .set({ content: safeContent, updatedAt: new Date() })
      .where(and(eq(pageContent.projectId, project.id), eq(pageContent.pageSlug, body.pageSlug)))
      .returning()
    return updated
  }
  const [inserted] = await db.insert(pageContent).values({
    projectId: project.id,
    pageSlug: body.pageSlug,
    content: safeContent,
  }).returning()
  return inserted
})
