import { useDb } from '~/server/db/index'
import { workStatusItems, projects, contractors, projectContractors } from '~/server/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { requireIntParam } from '~/server/utils/query'

const Body = z.object({
  projectSlug: z.string().max(200),
  contractorId: z.number(),
  title: z.string().min(1).max(500),
  workType: z.string().max(200).optional().nullable(),
  dateStart: z.string().max(50).optional().nullable(),
  dateEnd: z.string().max(50).optional().nullable(),
  budget: z.string().max(100).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const companyId = requireIntParam(event, 'id')
  // Auth: admin or the contractor themselves
  const auth = requireAdminOrContractor(event, companyId)
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

  // Verify contractor is linked to this project (skip for admin)
  if (auth.role === 'contractor') {
    const [linked] = await db
      .select({ id: projectContractors.id })
      .from(projectContractors)
      .where(and(
        eq(projectContractors.projectId, project.id),
        eq(projectContractors.contractorId, companyId),
      ))
      .limit(1)
    if (!linked) throw createError({ statusCode: 403, statusMessage: 'Contractor not linked to project' })
  }

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
