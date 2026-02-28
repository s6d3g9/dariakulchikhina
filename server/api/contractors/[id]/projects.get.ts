import { useDb } from '~/server/db/index'
import { projects, projectContractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const adminSession = getAdminSession(event)
  const contractorSession = getContractorSession(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!adminSession && contractorSession !== id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  if (!id) throw createError({ statusCode: 400 })

  const db = useDb()
  const rows = await db
    .select({ id: projects.id, slug: projects.slug, title: projects.title, status: projects.status })
    .from(projectContractors)
    .innerJoin(projects, eq(projectContractors.projectId, projects.id))
    .where(eq(projectContractors.contractorId, id))
    .orderBy(projects.title)

  return rows
})
