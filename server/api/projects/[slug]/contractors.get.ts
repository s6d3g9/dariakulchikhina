import { useDb } from '~/server/db/index'
import { projects, projectContractors, contractors } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Allow either admin or client authenticated for this project
  const adminSession = getAdminSession(event)
  const clientSlug = getClientSession(event)
  const slug = getRouterParam(event, 'slug')!
  if (!adminSession && clientSlug !== slug) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404, message: 'Проект не найден' })

  const rows = await db
    .select({ contractor: contractors })
    .from(projectContractors)
    .innerJoin(contractors, eq(projectContractors.contractorId, contractors.id))
    .where(eq(projectContractors.projectId, project.id))
    .orderBy(contractors.name)

  return rows.map(r => r.contractor)
})
