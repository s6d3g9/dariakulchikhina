import { useDb } from '~/server/db/index'
import { designerProjects, projects, designerProjectClients, clients } from '~/server/db/schema'
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
      stage: designerProjects.stage,
      createdAt: designerProjects.createdAt,
      updatedAt: projects.updatedAt,
      projectTitle: projects.title,
      projectSlug: projects.slug,
      projectStatus: projects.status,
    })
    .from(designerProjects)
    .leftJoin(projects, eq(designerProjects.projectId, projects.id))
    .where(eq(designerProjects.designerId, designerId))
    .orderBy(designerProjects.createdAt)

  // Fetch first client name for each project
  const result = await Promise.all(rows.map(async (row) => {
    const [clientLink] = await db
      .select({ clientName: clients.name, clientPhone: clients.phone })
      .from(designerProjectClients)
      .leftJoin(clients, eq(clients.id, designerProjectClients.clientId))
      .where(eq(designerProjectClients.designerProjectId, row.id))
      .limit(1)
    return { ...row, clientName: clientLink?.clientName ?? null, clientPhone: clientLink?.clientPhone ?? null }
  }))

  return result
})

