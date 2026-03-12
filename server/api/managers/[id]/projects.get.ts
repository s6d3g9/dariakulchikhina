import { useDb } from '~/server/db/index'
import { managerProjects, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid manager id' })
  const db = useDb()

  const rows = await db
    .select({
      id: managerProjects.id,
      role: managerProjects.role,
      assignedAt: managerProjects.assignedAt,
      projectId: projects.id,
      projectName: projects.title,
      projectSlug: projects.slug,
    })
    .from(managerProjects)
    .innerJoin(projects, eq(managerProjects.projectId, projects.id))
    .where(eq(managerProjects.managerId, id))

  return rows
})
