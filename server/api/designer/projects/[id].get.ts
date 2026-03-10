import { useDb } from '~/server/db/index'
import {
  designerProjects, projects, clients, contractors,
  designerProjectClients, designerProjectContractors,
  documents, tasks,
} from '~/server/db/schema'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const designerId = requireDesigner(event)
  const dpId = Number(getRouterParam(event, 'id'))
  if (!dpId || !Number.isFinite(dpId)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const db = useDb()

  // Fetch the designer-project row (must belong to this designer)
  const [dp] = await db
    .select({
      id: designerProjects.id,
      designerId: designerProjects.designerId,
      projectId: designerProjects.projectId,
      packageKey: designerProjects.packageKey,
      pricePerSqm: designerProjects.pricePerSqm,
      area: designerProjects.area,
      totalPrice: designerProjects.totalPrice,
      status: designerProjects.status,
      stage: designerProjects.stage,
      notes: designerProjects.notes,
      createdAt: designerProjects.createdAt,
      projectTitle: projects.title,
      projectSlug: projects.slug,
      projectStatus: projects.status,
    })
    .from(designerProjects)
    .leftJoin(projects, eq(projects.id, designerProjects.projectId))
    .where(and(
      eq(designerProjects.id, dpId),
      eq(designerProjects.designerId, designerId),
    ))
    .limit(1)

  if (!dp) throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })

  // Clients
  const dpClients = await db
    .select({
      linkId: designerProjectClients.id,
      id: clients.id,
      name: clients.name,
      phone: clients.phone,
      email: clients.email,
      messenger: clients.messenger,
      messengerNick: clients.messengerNick,
      address: clients.address,
      notes: clients.notes,
      brief: clients.brief,
    })
    .from(designerProjectClients)
    .leftJoin(clients, eq(clients.id, designerProjectClients.clientId))
    .where(eq(designerProjectClients.designerProjectId, dpId))

  // Contractors
  const dpContractors = await db
    .select({
      linkId: designerProjectContractors.id,
      role: designerProjectContractors.role,
      id: contractors.id,
      name: contractors.name,
      companyName: contractors.companyName,
      phone: contractors.phone,
      email: contractors.email,
      telegram: contractors.telegram,
      workTypes: contractors.workTypes,
    })
    .from(designerProjectContractors)
    .leftJoin(contractors, eq(contractors.id, designerProjectContractors.contractorId))
    .where(eq(designerProjectContractors.designerProjectId, dpId))

  // Documents (project-level)
  const dpDocs = dp.projectId
    ? await db
        .select()
        .from(documents)
        .where(eq(documents.projectId, dp.projectId))
        .orderBy(documents.createdAt)
    : []

  // Tasks
  const dpTasks = dp.projectId
    ? await db
        .select()
        .from(tasks)
        .where(eq(tasks.projectId, dp.projectId))
        .orderBy(tasks.createdAt)
    : []

  return {
    ...dp,
    clients: dpClients,
    contractors: dpContractors,
    documents: dpDocs,
    tasks: dpTasks,
  }
})
