import { useDb } from '~/server/db/index'
import { workStatusItems, projects } from '~/server/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({
  items: z.array(z.object({
    id: z.number().optional(),
    contractorId: z.number().optional().nullable(),
    title: z.string(),
    workType: z.string().optional().nullable(),
    status: z.string().default('pending'),
    dateStart: z.string().optional().nullable(),
    dateEnd: z.string().optional().nullable(),
    budget: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    sortOrder: z.number().optional(),
  })).max(500)
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, Body)
  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404 })

  const incomingIds = body.items.filter(i => i.id).map(i => i.id!)

  // Wrap in transaction to prevent partial updates / data loss
  await db.transaction(async (tx) => {
    // Удаляем только те, которые не присутствуют в списке
    const existing = await tx
      .select({ id: workStatusItems.id })
      .from(workStatusItems)
      .where(eq(workStatusItems.projectId, project.id))

    const toDelete = existing.map(e => e.id).filter(id => !incomingIds.includes(id))
    if (toDelete.length > 0) {
      await tx.delete(workStatusItems).where(inArray(workStatusItems.id, toDelete))
    }

    // Upsert: обновляем существующие, вставляем новые
    for (let idx = 0; idx < body.items.length; idx++) {
      const i = body.items[idx]
      const vals = {
        projectId: project.id,
        contractorId: i.contractorId || null,
        title: i.title,
        workType: i.workType || null,
        status: i.status,
        dateStart: i.dateStart || null,
        dateEnd: i.dateEnd || null,
        budget: i.budget || null,
        notes: i.notes || null,
        sortOrder: i.sortOrder ?? idx,
      }
      if (i.id) {
        // Guard: only update items belonging to THIS project
        await tx.update(workStatusItems).set(vals).where(
          and(eq(workStatusItems.id, i.id), eq(workStatusItems.projectId, project.id))
        )
      } else {
        await tx.insert(workStatusItems).values(vals)
      }
    }
  })

  return db
    .select()
    .from(workStatusItems)
    .where(eq(workStatusItems.projectId, project.id))
    .orderBy(workStatusItems.sortOrder)
})
