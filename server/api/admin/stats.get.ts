import { useDb } from '~/server/db/index'
import { projects, clients, contractors, designers, workStatusItems } from '~/server/db/schema'
import { sql, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()

  // Project counts by phase + task aggregates per project
  const projectRows = await db
    .select({
      id: projects.id,
      slug: projects.slug,
      title: projects.title,
      status: projects.status,
      createdAt: projects.createdAt,
      taskTotal: sql<number>`cast(count(${workStatusItems.id}) as int)`,
      taskDone: sql<number>`cast(sum(case when ${workStatusItems.status} = 'done' then 1 else 0 end) as int)`,
      taskOverdue: sql<number>`cast(sum(case when ${workStatusItems.status} not in ('done','cancelled') and ${workStatusItems.dateEnd} is not null and ${workStatusItems.dateEnd} < current_date::text then 1 else 0 end) as int)`,
    })
    .from(projects)
    .leftJoin(workStatusItems, eq(workStatusItems.projectId, projects.id))
    .groupBy(projects.id)
    .orderBy(projects.createdAt)

  // Entity counts
  const [clientCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(clients)
  const [contractorCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(contractors)
  const [designerCount] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(designers)

  // Aggregate totals
  const totalProjects = projectRows.length
  const totalTasks = projectRows.reduce((s: number, r: any) => s + (r.taskTotal || 0), 0)
  const totalDone = projectRows.reduce((s: number, r: any) => s + (r.taskDone || 0), 0)
  const totalOverdue = projectRows.reduce((s: number, r: any) => s + (r.taskOverdue || 0), 0)

  // Phase distribution
  const phaseMap: Record<string, number> = {}
  for (const p of projectRows) {
    const key = p.status || 'lead'
    phaseMap[key] = (phaseMap[key] || 0) + 1
  }

  return {
    projects: projectRows,
    totals: {
      projects: totalProjects,
      tasks: totalTasks,
      done: totalDone,
      overdue: totalOverdue,
      clients: clientCount.count,
      contractors: contractorCount.count,
      designers: designerCount.count,
    },
    phases: phaseMap,
  }
})
