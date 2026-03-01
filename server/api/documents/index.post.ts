import { useDb } from '~/server/db/index'
import { documents, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { readNodeBody } from '~/server/utils/body'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readNodeBody(event) as {
    title: string
    category: string
    filename?: string
    url?: string
    projectSlug?: string
    notes?: string
  }

  if (!body.title?.trim()) throw createError({ statusCode: 400, statusMessage: 'title required' })

  const db = useDb()
  let projectId: number | null = null

  if (body.projectSlug) {
    const [proj] = await db.select({ id: projects.id }).from(projects)
      .where(eq(projects.slug, body.projectSlug)).limit(1)
    projectId = proj?.id ?? null
  }

  const [doc] = await db.insert(documents).values({
    title: body.title.trim(),
    category: body.category || 'other',
    filename: body.filename || null,
    url: body.url || null,
    projectId,
    notes: body.notes || null,
  }).returning()

  return doc
})
