import { useDb } from '~/server/db/index'
import { documents, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(500).transform(s => s.trim()).optional(),
  category: z.enum([
    'contract', 'contract_supply', 'contract_work',
    'act', 'act_defect',
    'invoice', 'estimate', 'specification', 'tz',
    'approval', 'warranty', 'photo_report', 'correspondence',
    'template', 'other',
  ]).optional(),
  filename: z.string().max(500).nullable().optional(),
  url: z.string().max(1000).nullable().optional(),
  projectSlug: z.string().max(200).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400 })

  const body = await readValidatedNodeBody(event, UpdateDocumentSchema)
  const db = useDb()

  const updates: Record<string, any> = {}
  if (body.title !== undefined) updates.title = body.title
  if (body.category !== undefined) updates.category = body.category
  if (body.filename !== undefined) updates.filename = body.filename
  if (body.url !== undefined) updates.url = body.url
  if (body.notes !== undefined) updates.notes = body.notes

  if (body.projectSlug !== undefined) {
    if (body.projectSlug) {
      const [proj] = await db.select({ id: projects.id }).from(projects)
        .where(eq(projects.slug, body.projectSlug)).limit(1)
      updates.projectId = proj?.id ?? null
    } else {
      updates.projectId = null
    }
  }

  if (Object.keys(updates).length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })
  }

  const [doc] = await db.update(documents)
    .set(updates)
    .where(eq(documents.id, id))
    .returning()

  if (!doc) throw createError({ statusCode: 404 })
  return doc
})
