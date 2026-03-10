import { useDb } from '~/server/db/index'
import { tasks, designerProjects } from '~/server/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'

const Schema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  workType: z.string().optional().nullable(),
  serviceDescription: z.string().optional().nullable(),
  dateStart: z.string().optional().nullable(),
  dateEnd: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  assignedContractorId: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const designerId = requireDesigner(event)
  const dpId = Number(getRouterParam(event, 'id'))
  if (!dpId) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb()

  // Verify project belongs to this designer
  const [dp] = await db
    .select({ projectId: designerProjects.projectId })
    .from(designerProjects)
    .where(and(eq(designerProjects.id, dpId), eq(designerProjects.designerId, designerId)))
    .limit(1)
  if (!dp) throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })

  const body = await readValidatedNodeBody(event, Schema)

  const [task] = await db.insert(tasks).values({
    title: body.title,
    description: body.description || null,
    projectId: dp.projectId,
    status: 'new',
    workType: body.workType || null,
    serviceDescription: body.serviceDescription || null,
    dateStart: body.dateStart || null,
    dateEnd: body.dateEnd || null,
    assignedContractorId: body.assignedContractorId || null,
    budget: body.budget ? String(body.budget) : null,
    notes: body.notes || null,
  }).returning()

  return task
})
