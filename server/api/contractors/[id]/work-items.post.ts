import { useDb } from '~/server/db/index'
import { workStatusItems, projects, contractors } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

const Body = z.object({
  projectSlug: z.string(),
  contractorId: z.number(),
  title: z.string().min(1),
  workType: z.string().optional().nullable(),
  dateStart: z.string().optional().nullable(),
  dateEnd: z.string().optional().nullable(),
  budget: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const companyId = Number(getRouterParam(event, 'id'))
  // Auth: admin or the contractor themselves
  requireAdminOrContractor(event, companyId)
  const body = await readValidatedNodeBody(event, Body)
  const db = useDb()

  // Разрешаем назначить задачу самому подрядчику или его сотруднику
  const targetId = body.contractorId
  if (targetId !== companyId) {
    const [master] = await db
      .select({ id: contractors.id })
      .from(contractors)
      .where(and(
        eq(contractors.id, targetId),
        eq(contractors.parentId, companyId),
      ))
      .limit(1)
    if (!master) throw createError({ statusCode: 403, statusMessage: 'Contractor not in staff' })
  }

  // Ищем проект по slug
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.slug, body.projectSlug))
    .limit(1)

  if (!project) throw createError({ statusCode: 404, statusMessage: 'Project not found' })

  const [item] = await db.insert(workStatusItems).values({
    projectId: project.id,
    contractorId: targetId,
    title: body.title,
    workType: body.workType || null,
    status: 'pending',
    dateStart: body.dateStart || null,
    dateEnd: body.dateEnd || null,
    budget: body.budget || null,
    notes: body.notes || null,
    sortOrder: 0,
  }).returning()

  return item
})
