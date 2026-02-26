import { useDb } from '~/server/db/index'
import { pageContent, projects } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({ pageSlug: z.string(), content: z.record(z.unknown()) })

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, Body)
  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404 })
  const existing = await db.select({ id: pageContent.id }).from(pageContent)
    .where(and(eq(pageContent.projectId, project.id), eq(pageContent.pageSlug, body.pageSlug))).limit(1)
  if (existing.length > 0) {
    const [updated] = await db.update(pageContent)
      .set({ content: body.content, updatedAt: new Date() })
      .where(and(eq(pageContent.projectId, project.id), eq(pageContent.pageSlug, body.pageSlug)))
      .returning()
    return updated
  }
  const [inserted] = await db.insert(pageContent).values({
    projectId: project.id,
    pageSlug: body.pageSlug,
    content: body.content,
  }).returning()
  return inserted
})
