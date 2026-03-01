import { useDb } from '~/server/db/index'
import { pageContent, projects } from '~/server/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const ANSWERS_PREFIX = '__answers__:'

const Body = z.object({
  pageSlug: z.string().min(1),
  selections: z.record(z.union([z.boolean(), z.number()])).default({}),
  textAnswers: z.record(z.string()).default({}),
  numberAnswers: z.record(z.union([z.number(), z.string()])).default({}),
})

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!

  const body = await readValidatedNodeBody(event, Body)

  const normalizedNumberAnswers = Object.fromEntries(
    Object.entries(body.numberAnswers).map(([key, value]) => [key, Math.max(0, Number(value) || 0)]),
  )

  const db = useDb()
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)

  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  }

  const storageSlug = `${ANSWERS_PREFIX}${body.pageSlug}`
  const content = {
    selections: body.selections,
    textAnswers: body.textAnswers,
    numberAnswers: normalizedNumberAnswers,
  }

  const existing = await db
    .select({ id: pageContent.id })
    .from(pageContent)
    .where(and(eq(pageContent.projectId, project.id), eq(pageContent.pageSlug, storageSlug)))
    .limit(1)

  if (existing.length > 0) {
    const [updated] = await db
      .update(pageContent)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(pageContent.projectId, project.id), eq(pageContent.pageSlug, storageSlug)))
      .returning()
    return updated
  }

  const [inserted] = await db
    .insert(pageContent)
    .values({ projectId: project.id, pageSlug: storageSlug, content })
    .returning()

  return inserted
})
