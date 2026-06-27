import { createHash } from 'node:crypto'
import { asc, inArray, sql } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { clients, documents, projects, workStatusItems } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import {
  createApiV1CrmClientsDto,
  type CrmCountByProjectId,
  type CrmWorkItemCountsByProjectId,
} from '~/server/utils/api-v1-crm'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const query = safeGetQuery(event)
  const q = typeof query.q === 'string' ? query.q : ''
  const projectSlug = typeof query.projectSlug === 'string' ? query.projectSlug : ''
  const limit = Number(query.limit || 100)
  const offset = Number(query.offset || 0)

  const db = useDb()
  const [clientRows, projectRows] = await Promise.all([
    db
      .select({
        id: clients.id,
        name: clients.name,
        phone: clients.phone,
        email: clients.email,
        messenger: clients.messenger,
        messengerNick: clients.messengerNick,
        address: clients.address,
        notes: clients.notes,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .orderBy(asc(clients.createdAt))
      .limit(1000),
    db
      .select({
        id: projects.id,
        slug: projects.slug,
        title: projects.title,
        status: projects.status,
        projectType: projects.projectType,
        profile: projects.profile,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .limit(2000),
  ])

  const projectIds = projectRows.map(project => project.id)
  const documentCountsByProjectId: CrmCountByProjectId = {}
  const workItemCountsByProjectId: CrmWorkItemCountsByProjectId = {}

  if (projectIds.length) {
    const [documentCounts, workItemCounts] = await Promise.all([
      db
        .select({
          projectId: documents.projectId,
          count: sql<number>`cast(count(*) as int)`,
        })
        .from(documents)
        .where(inArray(documents.projectId, projectIds))
        .groupBy(documents.projectId),
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

    for (const row of documentCounts) {
      if (row.projectId) documentCountsByProjectId[row.projectId] = row.count
    }

    for (const row of workItemCounts) {
      workItemCountsByProjectId[row.projectId] = {
        total: row.total,
        done: row.done,
        overdue: row.overdue,
      }
    }
  }

  const data = createApiV1CrmClientsDto({
    clients: clientRows,
    projects: projectRows.map(project => ({
      ...project,
      profile: (project.profile || {}) as Record<string, unknown>,
    })),
    documentCountsByProjectId,
    workItemCountsByProjectId,
    filters: {
      q,
      projectSlug,
      limit,
      offset,
    },
  })

  const revisionHash = createHash('sha1')
    .update(JSON.stringify({
      summary: data.summary,
      filters: data.filters,
      items: data.items.map(item => ({
        id: item.id,
        projects: item.linkedProjects.map(project => project.id),
        documentsCount: item.documentsCount,
        openWorkItems: item.openWorkItems,
      })),
    }))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `crm-clients:${revisionHash}`,
  })
})
