import { createHash } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'

import { useDb } from '~/server/db'
import { projects, workStatusItems } from '~/server/db/schema'
import { createApiV1Envelope } from '~/server/utils/api-v1'
import { requireAdmin } from '~/server/utils/auth'
import { applyMessengerCors } from '~/server/utils/messenger-cors'

export default defineEventHandler(async (event) => {
  applyMessengerCors(event)
  requireAdmin(event)

  const db = useDb()
  const rows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      projectType: projects.projectType,
      pages: projects.pages,
      createdAt: projects.createdAt,
      taskTotal: sql<number>`cast(count(${workStatusItems.id}) as int)`,
      taskDone: sql<number>`cast(coalesce(sum(case when ${workStatusItems.status} = 'done' then 1 else 0 end), 0) as int)`,
      taskOverdue: sql<number>`cast(coalesce(sum(case when ${workStatusItems.status} not in ('done','cancelled') and ${workStatusItems.dateEnd} is not null and ${workStatusItems.dateEnd} < current_date::text then 1 else 0 end), 0) as int)`,
    })
    .from(projects)
    .leftJoin(workStatusItems, eq(workStatusItems.projectId, projects.id))
    .groupBy(projects.id)
    .orderBy(projects.createdAt)

  const data = rows.map((project) => ({
    id: project.id,
    slug: project.slug,
    title: project.title,
    status: project.status,
    projectType: project.projectType || '',
    pages: project.pages || [],
    createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : String(project.createdAt || ''),
    taskTotal: Number(project.taskTotal || 0),
    taskDone: Number(project.taskDone || 0),
    taskOverdue: Number(project.taskOverdue || 0),
  }))

  const revisionHash = createHash('sha1')
    .update(JSON.stringify(data.map(project => ({
      id: project.id,
      slug: project.slug,
      status: project.status,
      taskTotal: project.taskTotal,
      taskDone: project.taskDone,
      taskOverdue: project.taskOverdue,
    }))))
    .digest('hex')

  return createApiV1Envelope(event, data, {
    revision: `messenger-projects:${revisionHash}`,
  })
})
