import { useDb } from '~/server/db/index'
import { projects, projectContractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  const id = requireIntParam(event, 'id')
  const adminSession = getAdminSession(event)
  const contractorSession = getContractorSession(event)
  if (!adminSession && contractorSession !== id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const db = useDb()
  const rows = await db
    .select({ id: projects.id, slug: projects.slug, title: projects.title, status: projects.status })
    .from(projectContractors)
    .innerJoin(projects, eq(projectContractors.projectId, projects.id))
    .where(eq(projectContractors.contractorId, id))
    .orderBy(projects.title)

  return rows
})
