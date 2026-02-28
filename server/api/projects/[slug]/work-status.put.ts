import { useDb } from '~/server/db/index'
import { workStatusItems, projects } from '~/server/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({
  items: z.array(z.object({
    id: z.number().optional(),
    contractorId: z.number().optional().nullable(),
    title: z.string(),
    workType: z.string().optional().nullable(),
    roadmapStageId: z.number().optional().nullable(),
    status: z.string().default('pending'),
    dateStart: z.string().optional().nullable(),
    dateEnd: z.string().optional().nullable(),
    budget: z.string().optional().nullable(),
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

  const incomingIds = body.items.filter(i => i.id).map(i => i.id!)

  // Удаляем только те, которые не присутствуют в списке
  const existing = await db
    .select({ id: workStatusItems.id })
    .from(workStatusItems)
    .where(eq(workStatusItems.projectId, project.id))

  const toDelete = existing.map(e => e.id).filter(id => !incomingIds.includes(id))
  if (toDelete.length > 0) {
    await db.delete(workStatusItems).where(inArray(workStatusItems.id, toDelete))
  }

  // Upsert: обновляем существующие, вставляем новые
  for (let idx = 0; idx < body.items.length; idx++) {
    const i = body.items[idx]
    const vals = {
      projectId: project.id,
      contractorId: i.contractorId || null,
      title: i.title,
      workType: i.workType || null,
      roadmapStageId: i.roadmapStageId || null,
      status: i.status,
      dateStart: i.dateStart || null,
      dateEnd: i.dateEnd || null,
      budget: i.budget || null,
      notes: i.notes || null,
      sortOrder: i.sortOrder ?? idx,
    }
    if (i.id) {
      await db.update(workStatusItems).set(vals).where(eq(workStatusItems.id, i.id))
    } else {
      await db.insert(workStatusItems).values(vals)
    }
  }

  return db
    .select()
    .from(workStatusItems)
    .where(eq(workStatusItems.projectId, project.id))
    .orderBy(workStatusItems.sortOrder)
})
