import { useDb } from '~/server/db/index'
import { workStatusItems, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const adminS = getAdminSession(event)
  const contractorS = getContractorSession(event)
  if (!adminS && contractorS !== id)
    throw createError({ statusCode: 401 })
  const db = useDb()
  const items = await db
    .select({
      id: workStatusItems.id,
      title: workStatusItems.title,
      status: workStatusItems.status,
      dateStart: workStatusItems.dateStart,
      dateEnd: workStatusItems.dateEnd,
      budget: workStatusItems.budget,
      notes: workStatusItems.notes,
      sortOrder: workStatusItems.sortOrder,
      projectSlug: projects.slug,
      projectTitle: projects.title,
    })
    .from(workStatusItems)
    .innerJoin(projects, eq(workStatusItems.projectId, projects.id))
    .where(eq(workStatusItems.contractorId, id))
    .orderBy(workStatusItems.sortOrder)
  return items
})
