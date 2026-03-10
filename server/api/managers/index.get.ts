import { useDb } from '~/server/db/index'
import { managers, managerProjects, projects } from '~/server/db/schema'
import { asc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()

  const q = safeGetQuery(event)
  const projectSlug = (q.projectSlug as string) || ''

  if (projectSlug) {
    const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, projectSlug)).limit(1)
    if (!project) return []
    const rows = await db
      .select({ manager: managers })
      .from(managerProjects)
      .innerJoin(managers, eq(managerProjects.managerId, managers.id))
      .where(eq(managerProjects.projectId, project.id))
      .orderBy(asc(managers.name))
    return rows.map(r => r.manager)
  }

  const rows = await db.select().from(managers).orderBy(asc(managers.createdAt))
  return rows
})
