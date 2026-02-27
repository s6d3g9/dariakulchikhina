import { useDb } from '~/server/db/index'
import { roadmapStages, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({
  stages: z.array(z.object({
    id: z.number().optional(),
    stageKey: z.string().optional(),
    title: z.string(),
    description: z.string().optional().nullable(),
    status: z.string().default('pending'),
    dateStart: z.string().optional().nullable(),
    dateEnd: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    sortOrder: z.number().optional(),
  }))
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, Body)
  const db = useDb()

  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404 })

  await db.delete(roadmapStages).where(eq(roadmapStages.projectId, project.id))

  if (body.stages.length > 0) {
    await db.insert(roadmapStages).values(body.stages.map((stage, index) => ({
      projectId: project.id,
      stageKey: stage.stageKey || null,
      title: stage.title,
      description: stage.description || null,
      status: stage.status,
      dateStart: stage.dateStart || null,
      dateEnd: stage.dateEnd || null,
      notes: stage.notes || null,
      sortOrder: stage.sortOrder ?? index,
    })))
  }

  return db
    .select()
    .from(roadmapStages)
    .where(eq(roadmapStages.projectId, project.id))
    .orderBy(roadmapStages.sortOrder)
})
