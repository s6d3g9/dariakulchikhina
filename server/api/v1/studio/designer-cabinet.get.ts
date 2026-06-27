import { createHash } from 'node:crypto'
import { asc, eq, inArray, sql } from 'drizzle-orm'

import { useDb } from '~/server/db'
import {
  clients,
  contractors,
  designerProjectClients,
  designerProjectContractors,
  designerProjects,
  designers,
  documents,
  projects,
  workStatusItems,
} from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import {
  createApiV1StudioDesignerCabinetDto,
  type ApiV1StudioDesignerProjectClientRow,
  type ApiV1StudioDesignerProjectContractorRow,
  type ApiV1StudioDesignerProjectDocumentRow,
  type ApiV1StudioDesignerProjectRow,
  type ApiV1StudioDesignerProjectWorkItemCountRow,
  type ApiV1StudioDesignerRow,
} from '~/server/utils/api-v1-studio-designer-cabinet'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = safeGetQuery(event)
  const q = typeof query.q === 'string' ? query.q : ''
  const designerId = query.designerId ? Number(query.designerId) : null
  const projectSlug = typeof query.projectSlug === 'string' ? query.projectSlug : ''
  const limit = Number(query.limit || 100)
  const offset = Number(query.offset || 0)

  const db = useDb()
  const [designerRows, designerProjectRows] = await Promise.all([
    db
      .select({
        id: designers.id,
        name: designers.name,
        companyName: designers.companyName,
        phone: designers.phone,
        email: designers.email,
        telegram: designers.telegram,
        website: designers.website,
        city: designers.city,
        experience: designers.experience,
        about: designers.about,
        specializations: designers.specializations,
        services: designers.services,
        packages: designers.packages,
        subscriptions: designers.subscriptions,
        createdAt: designers.createdAt,
        updatedAt: designers.updatedAt,
      })
      .from(designers)
      .orderBy(asc(designers.name))
      .limit(500),
    db
      .select({
        id: designerProjects.id,
        designerId: designerProjects.designerId,
        projectId: designerProjects.projectId,
        packageKey: designerProjects.packageKey,
        pricePerSqm: designerProjects.pricePerSqm,
        area: designerProjects.area,
        totalPrice: designerProjects.totalPrice,
        status: designerProjects.status,
        notes: designerProjects.notes,
        createdAt: designerProjects.createdAt,
        project: {
          id: projects.id,
          slug: projects.slug,
          title: projects.title,
          status: projects.status,
          projectType: projects.projectType,
          updatedAt: projects.updatedAt,
        },
      })
      .from(designerProjects)
      .innerJoin(projects, eq(projects.id, designerProjects.projectId))
      .orderBy(asc(projects.title))
      .limit(3000),
  ])

  const designerProjectIds = designerProjectRows.map(row => row.id)
  const projectIds = Array.from(new Set(designerProjectRows.map(row => row.projectId)))
  let clientRows: ApiV1StudioDesignerProjectClientRow[] = []
  let contractorRows: ApiV1StudioDesignerProjectContractorRow[] = []
  let documentRows: ApiV1StudioDesignerProjectDocumentRow[] = []
  const workItemCountsByProjectId: Record<number, ApiV1StudioDesignerProjectWorkItemCountRow> = {}

  if (designerProjectIds.length) {
    const [linkedClients, linkedContractors] = await Promise.all([
      db
        .select({
          designerProjectId: designerProjectClients.designerProjectId,
          clientId: clients.id,
          name: clients.name,
          phone: clients.phone,
          email: clients.email,
        })
        .from(designerProjectClients)
        .innerJoin(clients, eq(clients.id, designerProjectClients.clientId))
        .where(inArray(designerProjectClients.designerProjectId, designerProjectIds)),
      db
        .select({
          designerProjectId: designerProjectContractors.designerProjectId,
          contractorId: contractors.id,
          name: contractors.name,
          companyName: contractors.companyName,
          role: designerProjectContractors.role,
        })
        .from(designerProjectContractors)
        .innerJoin(contractors, eq(contractors.id, designerProjectContractors.contractorId))
        .where(inArray(designerProjectContractors.designerProjectId, designerProjectIds)),
    ])

    clientRows = linkedClients
    contractorRows = linkedContractors
  }

  if (projectIds.length) {
    const [projectDocuments, workItemCounts] = await Promise.all([
      db
        .select({
          id: documents.id,
          projectId: documents.projectId,
          category: documents.category,
          title: documents.title,
          filename: documents.filename,
          url: documents.url,
          createdAt: documents.createdAt,
        })
        .from(documents)
        .where(inArray(documents.projectId, projectIds))
        .orderBy(asc(documents.createdAt)),
      db
        .select({
          projectId: workStatusItems.projectId,
          total: sql<number>`cast(count(*) as int)`,
          done: sql<number>`cast(coalesce(sum(case when ${workStatusItems.status} = 'done' then 1 else 0 end), 0) as int)`,
          overdue: sql<number>`cast(coalesce(sum(case when ${workStatusItems.status} not in ('done','cancelled') and ${workStatusItems.dateEnd} is not null and ${workStatusItems.dateEnd} < current_date::text then 1 else 0 end), 0) as int)`,
        })
        .from(workStatusItems)
        .where(inArray(workStatusItems.projectId, projectIds))
        .groupBy(workStatusItems.projectId),
    ])

    documentRows = projectDocuments

    for (const row of workItemCounts) {
      workItemCountsByProjectId[row.projectId] = {
        projectId: row.projectId,
        total: row.total,
        done: row.done,
        overdue: row.overdue,
      }
    }
  }

  const data = createApiV1StudioDesignerCabinetDto({
    designers: designerRows as ApiV1StudioDesignerRow[],
    designerProjects: designerProjectRows as ApiV1StudioDesignerProjectRow[],
    clients: clientRows,
    contractors: contractorRows,
    documents: documentRows,
    workItemCountsByProjectId,
    filters: {
      q,
      designerId,
      projectSlug,
      limit,
      offset,
    },
  })

  const revisionHash = createHash('sha1')
    .update(JSON.stringify({
      summary: data.summary,
      filters: data.filters,
      designers: data.designers.map(designer => ({
        id: designer.id,
        projects: designer.projectIds,
        activeProjectsCount: designer.activeProjectsCount,
        services: designer.servicesSummary,
      })),
      projects: data.projects.map(project => ({
        id: project.id,
        status: project.status,
        project: project.project.id,
        clients: project.clients.map(client => client.id),
        documents: project.documents.total,
        approvals: project.approvals.total,
        construction: project.construction,
      })),
    }))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `studio-designer-cabinet:${revisionHash}`,
  })
})
