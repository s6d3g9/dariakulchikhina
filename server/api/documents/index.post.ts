import { useDb } from '~/server/db/index'
import { documents, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const CreateDocumentSchema = z.object({
  title: z.string().min(1).max(500).transform(s => s.trim()),
  category: z.enum(['contract', 'act', 'invoice', 'template', 'other']).default('other'),
  filename: z.string().max(500).nullable().optional(),
  url: z.string().max(1000).nullable().optional(),
  projectSlug: z.string().max(200).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateDocumentSchema)

  const db = useDb()
  let projectId: number | null = null

  if (body.projectSlug) {
    const [proj] = await db.select({ id: projects.id }).from(projects)
      .where(eq(projects.slug, body.projectSlug)).limit(1)
    projectId = proj?.id ?? null
  }

  const [doc] = await db.insert(documents).values({
    title: body.title,
    category: body.category,
    filename: body.filename || null,
    url: body.url || null,
    projectId,
    notes: body.notes || null,
  }).returning()

  return doc
})
