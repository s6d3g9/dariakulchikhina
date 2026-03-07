import { useDb } from '~/server/db/index'
import { tasks } from '~/server/db/schema'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db   = useDb()
  const body = await readBody(event)

  if (!body?.title) {
    throw createError({ statusCode: 400, message: 'title is required' })
  }

  const [row] = await db.insert(tasks).values({
    title:                body.title,
    description:          body.description   ?? null,
    projectId:            body.projectId      ? Number(body.projectId)      : null,
    status:               body.status         ?? 'new',
    workType:             body.workType        ?? null,
    serviceDescription:   body.serviceDescription ?? null,
    dateStart:            body.dateStart       ?? null,
    dateEnd:              body.dateEnd         ?? null,
    address:              body.address         ?? null,
    assignedContractorId: body.assignedContractorId ? Number(body.assignedContractorId) : null,
    requirements:         body.requirements    ?? null,
    budget:               body.budget          ?? null,
    notes:                body.notes           ?? null,
    createdBy:            body.createdBy        ? Number(body.createdBy)      : null,
  }).returning()

  return row
})
