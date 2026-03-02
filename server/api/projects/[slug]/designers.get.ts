import { useDb } from '~/server/db/index'
import { projects, designerProjects, designers } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  requireAdminOrClient(event, slug)

  const db = useDb()
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.slug, slug)).limit(1)
  if (!project) throw createError({ statusCode: 404, message: 'Проект не найден' })

  const rows = await db
    .select({ designer: designers })
    .from(designerProjects)
    .innerJoin(designers, eq(designerProjects.designerId, designers.id))
    .where(eq(designerProjects.projectId, project.id))
    .orderBy(designers.name)

  return rows.map(r => r.designer)
})
