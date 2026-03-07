import { useDb } from '~/server/db/index'
import { tasks } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db   = useDb()
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody(event)

  const patch: Record<string, unknown> = {
    updatedAt: new Date(),
  }
  const fields = [
    'title', 'description', 'projectId', 'status', 'workType',
    'serviceDescription', 'dateStart', 'dateEnd', 'address',
    'assignedContractorId', 'requirements', 'budget', 'notes',
  ] as const

  for (const f of fields) {
    if (f in body) {
      patch[f] = body[f] !== undefined ? body[f] : null
    }
  }

  // coerce FK numbers
  if ('projectId' in patch && patch.projectId !== null)
    patch.projectId = Number(patch.projectId)
  if ('assignedContractorId' in patch && patch.assignedContractorId !== null)
    patch.assignedContractorId = Number(patch.assignedContractorId)

  const [row] = await db.update(tasks).set(patch as any).where(eq(tasks.id, id)).returning()
  if (!row) throw createError({ statusCode: 404, message: 'Task not found' })
  return row
})
