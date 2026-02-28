import { useDb } from '~/server/db/index'
import { workStatusItems, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
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
    sortOrder: z.number(),
  }))
})

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, Body)
  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404 })
  await db.delete(workStatusItems).where(eq(workStatusItems.projectId, project.id))
  if (body.items.length > 0) {
    await db.insert(workStatusItems).values(body.items.map(i => ({
      projectId: project.id,
      contractorId: i.contractorId || null,
      title: i.title,
      workType: i.workType || null,
      status: i.status,
      dateStart: i.dateStart || null,
      dateEnd: i.dateEnd || null,
      budget: i.budget || null,
      notes: i.notes || null,
      sortOrder: i.sortOrder,
    })))
  }
  return db.select().from(workStatusItems).where(eq(workStatusItems.projectId, project.id)).orderBy(workStatusItems.sortOrder)
})
