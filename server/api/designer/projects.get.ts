import { useDb } from '~/server/db/index'
import { designerProjects, projects } from '~/server/db/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const designerId = requireDesigner(event)
  const db = useDb()

  const rows = await db
    .select({
      id: designerProjects.id,
      projectId: designerProjects.projectId,
      packageKey: designerProjects.packageKey,
      status: designerProjects.status,
      totalPrice: designerProjects.totalPrice,
      area: designerProjects.area,
      notes: designerProjects.notes,
      createdAt: designerProjects.createdAt,
      projectTitle: projects.title,
      projectSlug: projects.slug,
      projectStatus: projects.status,
    })
    .from(designerProjects)
    .leftJoin(projects, eq(designerProjects.projectId, projects.id))
    .where(eq(designerProjects.designerId, designerId))
    .orderBy(designerProjects.createdAt)

  return rows
})
