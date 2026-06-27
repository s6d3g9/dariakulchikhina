import { createHash } from 'node:crypto'
import { desc, eq, sql } from 'drizzle-orm'

import { useDb } from '~/server/db'
import {
  clients,
  contractors,
  designerProjects,
  designers,
  documents,
  managers,
  projectExtraServices,
  projects,
  sellers,
  workStatusItems,
} from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { createApiV1StudioShellDto } from '~/server/utils/api-v1-studio-shell'
import { requireAdmin } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const db = useDb()
  const [
    projectCountRows,
    clientCountRows,
    designerCountRows,
    designerProjectCountRows,
    contractorCountRows,
    documentCountRows,
    managerCountRows,
    sellerCountRows,
    extraServiceCountRows,
    workItemCountRows,
    projectStatusCounts,
    recentProjects,
    recentClients,
    recentDocuments,
  ] = await Promise.all([
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(projects),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(clients),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(designers),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(designerProjects),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(contractors),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(documents),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(managers),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(sellers),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(projectExtraServices),
    db.select({
      total: sql<number>`cast(count(*) as int)`,
      done: sql<number>`cast(coalesce(sum(case when ${workStatusItems.status} = 'done' then 1 else 0 end), 0) as int)`,
      overdue: sql<number>`cast(coalesce(sum(case when ${workStatusItems.status} not in ('done','cancelled') and ${workStatusItems.dateEnd} is not null and ${workStatusItems.dateEnd} < current_date::text then 1 else 0 end), 0) as int)`,
    }).from(workStatusItems),
    db
      .select({
        status: projects.status,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(projects)
      .groupBy(projects.status),
    db
      .select({
        id: projects.id,
        slug: projects.slug,
        title: projects.title,
        status: projects.status,
        projectType: projects.projectType,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .orderBy(desc(projects.updatedAt))
      .limit(5),
    db
      .select({
        id: clients.id,
        name: clients.name,
        createdAt: clients.createdAt,
      })
      .from(clients)
      .orderBy(desc(clients.createdAt))
      .limit(5),
    db
      .select({
        id: documents.id,
        title: documents.title,
        category: documents.category,
        projectSlug: projects.slug,
        projectTitle: projects.title,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .leftJoin(projects, eq(documents.projectId, projects.id))
      .orderBy(desc(documents.createdAt))
      .limit(5),
  ])

  const data = createApiV1StudioShellDto({
    counts: {
      projects: projectCountRows[0]?.count || 0,
      clients: clientCountRows[0]?.count || 0,
      designers: designerCountRows[0]?.count || 0,
      designerProjects: designerProjectCountRows[0]?.count || 0,
      contractors: contractorCountRows[0]?.count || 0,
      documents: documentCountRows[0]?.count || 0,
      managers: managerCountRows[0]?.count || 0,
      sellers: sellerCountRows[0]?.count || 0,
      extraServices: extraServiceCountRows[0]?.count || 0,
    },
    workItems: {
      total: workItemCountRows[0]?.total || 0,
      done: workItemCountRows[0]?.done || 0,
      overdue: workItemCountRows[0]?.overdue || 0,
    },
    projectStatusCounts,
    recentProjects,
    recentClients,
    recentDocuments,
  })

  const revisionHash = createHash('sha1')
    .update(JSON.stringify({
      projectSummary: data.projectSummary,
      zones: Object.values(data.zones).map(zone => ({
        key: zone.key,
        state: zone.state,
        metrics: zone.metrics,
        recent: zone.recent.map(item => item.id),
      })),
      recentProjects: data.recentProjects.map(item => item.id),
    }))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `studio-shell:${revisionHash}`,
  })
})
