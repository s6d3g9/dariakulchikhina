import { useDb } from '~/server/db/index'
import { roadmapStages, projects } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { normalizeRoadmapStatus } from '~~/shared/utils/roadmap'

const Body = z.object({
  stageKey: z.string(),
  title: z.string().optional(),
  status: z.string(),
  description: z.string().optional().nullable(),
  dateStart: z.string().optional().nullable(),
  dateEnd: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, Body)
  const db = useDb()

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1)
  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  // Find existing stage by stageKey
  const [existing] = await db
    .select()
    .from(roadmapStages)
    .where(and(eq(roadmapStages.projectId, project.id), eq(roadmapStages.stageKey, body.stageKey)))
    .limit(1)

  const status = normalizeRoadmapStatus(body.status)

  if (existing) {
    // Update existing stage
    const updates: Record<string, unknown> = { status }
    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.dateStart !== undefined) updates.dateStart = body.dateStart
    if (body.dateEnd !== undefined) updates.dateEnd = body.dateEnd
    if (body.notes !== undefined) updates.notes = body.notes

    await db.update(roadmapStages).set(updates).where(eq(roadmapStages.id, existing.id))
    return { ...existing, ...updates }
  }

  // Create new stage if not found
  const maxSort = await db
    .select({ maxSort: roadmapStages.sortOrder })
    .from(roadmapStages)
    .where(eq(roadmapStages.projectId, project.id))
    .orderBy(roadmapStages.sortOrder)

  const sortOrder = maxSort.length > 0 ? (maxSort[maxSort.length - 1].maxSort ?? 0) + 1 : 0

  const [inserted] = await db.insert(roadmapStages).values({
    projectId: project.id,
    stageKey: body.stageKey,
    title: body.title || body.stageKey,
    description: body.description || null,
    status,
    dateStart: body.dateStart || null,
    dateEnd: body.dateEnd || null,
    notes: body.notes || null,
    sortOrder,
  }).returning()

  return inserted
})
