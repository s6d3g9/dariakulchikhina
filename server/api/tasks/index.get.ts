import { useDb } from '~/server/db/index'
import { tasks, contractors, projects } from '~/server/db/schema'
import { desc, eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const q = safeGetQuery(event) as { status?: string; projectId?: string; contractorId?: string }

  const conditions = []
  if (q.status) conditions.push(eq(tasks.status, q.status))
  if (q.projectId) conditions.push(eq(tasks.projectId, Number(q.projectId)))
  if (q.contractorId) conditions.push(eq(tasks.assignedContractorId, Number(q.contractorId)))

  const rows = await db
    .select({
      id:                   tasks.id,
      title:                tasks.title,
      description:          tasks.description,
      projectId:            tasks.projectId,
      projectTitle:         projects.title,
      status:               tasks.status,
      workType:             tasks.workType,
      serviceDescription:   tasks.serviceDescription,
      dateStart:            tasks.dateStart,
      dateEnd:              tasks.dateEnd,
      address:              tasks.address,
      assignedContractorId: tasks.assignedContractorId,
      contractorName:       contractors.name,
      requirements:         tasks.requirements,
      budget:               tasks.budget,
      notes:                tasks.notes,
      createdBy:            tasks.createdBy,
      createdAt:            tasks.createdAt,
      updatedAt:            tasks.updatedAt,
    })
    .from(tasks)
    .leftJoin(projects,    eq(tasks.projectId,            projects.id))
    .leftJoin(contractors, eq(tasks.assignedContractorId, contractors.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(tasks.createdAt))

  return rows
})
