import { useDb } from '~/server/db/index'
import { projects, projectContractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const contractorId = Number(getRouterParam(event, 'id'))
  if (!contractorId) throw createError({ statusCode: 400 })

  const db = useDb()
  const rows = await db
    .select({ id: projects.id, slug: projects.slug, title: projects.title, status: projects.status })
    .from(projectContractors)
    .innerJoin(projects, eq(projectContractors.projectId, projects.id))
    .where(eq(projectContractors.contractorId, contractorId))
    .orderBy(projects.title)

  return rows
})
