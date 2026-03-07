import { useDb } from '~/server/db/index'
import { tasks, contractors, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const id = Number(getRouterParam(event, 'id'))

  const [row] = await db
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
      contractorPhone:      contractors.phone,
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
    .where(eq(tasks.id, id))

  if (!row) throw createError({ statusCode: 404, message: 'Task not found' })
  return row
})
