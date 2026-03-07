import { useDb } from '~/server/db/index'
import { designers, designerProjects, designerProjectClients, designerProjectContractors, projects, clients, contractors } from '~/server/db/schema'
import { eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(event.context.params?.id)
  if (!id || !Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })

  const db = useDb()
  const [designer] = await db.select().from(designers).where(eq(designers.id, id)).limit(1)
  if (!designer) throw createError({ statusCode: 404, statusMessage: 'Designer not found' })

  // Fetch designer projects with linked project info, clients, and contractors
  const dpRows = await db
    .select({
      dp: designerProjects,
      projectSlug: projects.slug,
      projectTitle: projects.title,
      projectStatus: projects.status,
    })
    .from(designerProjects)
    .leftJoin(projects, eq(projects.id, designerProjects.projectId))
    .where(eq(designerProjects.designerId, id))

  const dpList = []
  for (const row of dpRows) {
    // Get clients for this designer project
    const dpClients = await db
      .select({
        id: clients.id,
        name: clients.name,
        phone: clients.phone,
        email: clients.email,
      })
      .from(designerProjectClients)
      .innerJoin(clients, eq(clients.id, designerProjectClients.clientId))
      .where(eq(designerProjectClients.designerProjectId, row.dp.id))

    // Get contractors
    const dpContractors = await db
      .select({
        id: contractors.id,
        name: contractors.name,
        role: designerProjectContractors.role,
      })
      .from(designerProjectContractors)
      .innerJoin(contractors, eq(contractors.id, designerProjectContractors.contractorId))
      .where(eq(designerProjectContractors.designerProjectId, row.dp.id))

    dpList.push({
      ...row.dp,
      projectSlug: row.projectSlug,
      projectTitle: row.projectTitle,
      projectStatus: row.projectStatus,
      clients: dpClients,
      contractors: dpContractors,
    })
  }

  return {
    ...designer,
    designerProjects: dpList,
  }
})
