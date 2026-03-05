import { useDb } from '~/server/db/index'
import { designers, designerProjects, projects, workStatusItems } from '~/server/db/schema'
import { eq, sql, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const today = new Date().toISOString().slice(0, 10)

  // All designers
  const allDesigners = await db.select().from(designers)

  // All designerProjects with linked project info
  const dpRows = await db
    .select({
      dp: designerProjects,
      projectTitle: projects.title,
      projectSlug: projects.slug,
      projectStatus: projects.status,
    })
    .from(designerProjects)
    .leftJoin(projects, eq(projects.id, designerProjects.projectId))

  // Work status stats per project
  const statsRows = await db
    .select({
      projectId: workStatusItems.projectId,
      total:     sql<number>`cast(count(*) as int)`,
      done:      sql<number>`cast(sum(case when ${workStatusItems.status} = 'done' then 1 else 0 end) as int)`,
      overdue:   sql<number>`cast(sum(case when ${workStatusItems.status} not in ('done','cancelled') and ${workStatusItems.dateEnd} is not null and ${workStatusItems.dateEnd} < ${today} then 1 else 0 end) as int)`,
      cancelled: sql<number>`cast(sum(case when ${workStatusItems.status} = 'cancelled' then 1 else 0 end) as int)`,
      inProgress:sql<number>`cast(sum(case when ${workStatusItems.status} not in ('done','cancelled') then 1 else 0 end) as int)`,
      nearDeadline: sql<number>`cast(sum(case when ${workStatusItems.status} not in ('done','cancelled') and ${workStatusItems.dateEnd} is not null and ${workStatusItems.dateEnd} between ${today} and ${new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)} then 1 else 0 end) as int)`,
    })
    .from(workStatusItems)
    .groupBy(workStatusItems.projectId)

  const statsMap = new Map(statsRows.map(r => [r.projectId!, r]))

  // Build cards keyed by status
  const STATUSES = ['draft', 'active', 'review', 'completed', 'paused'] as const
  type Status = typeof STATUSES[number]
  const columns: Record<Status, any[]> = { draft: [], active: [], review: [], completed: [], paused: [] }

  for (const dp of dpRows) {
    const designer = allDesigners.find(d => d.id === dp.dp.designerId)
    if (!designer) continue
    const stats = statsMap.get(dp.dp.projectId) ?? { total: 0, done: 0, overdue: 0, cancelled: 0, inProgress: 0, nearDeadline: 0 }
    const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

    const alerts: string[] = []
    if (stats.overdue > 0) alerts.push(`${stats.overdue} задач просрочено`)
    if (stats.nearDeadline > 0) alerts.push(`${stats.nearDeadline} задач истекают на этой неделе`)
    if (!designer.phone && !designer.email) alerts.push('нет контактов')

    const card = {
      dpId:          dp.dp.id,
      designerId:    designer.id,
      designerName:  designer.name,
      designerInitials: designer.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
      designerPhone: designer.phone,
      designerEmail: designer.email,
      designerCity:  designer.city,
      projectTitle:  dp.projectTitle ?? '—',
      projectSlug:   dp.projectSlug ?? '',
      projectStatus: dp.projectStatus ?? 'lead',
      area:          dp.dp.area,
      totalPrice:    dp.dp.totalPrice,
      status:        dp.dp.status as Status,
      notes:         dp.dp.notes,
      stats: {
        total:       stats.total,
        done:        stats.done,
        overdue:     stats.overdue,
        cancelled:   stats.cancelled,
        inProgress:  stats.inProgress,
        nearDeadline: stats.nearDeadline,
      },
      progress,
      alerts,
    }

    const col = STATUSES.includes(dp.dp.status as Status) ? dp.dp.status as Status : 'draft'
    columns[col].push(card)
  }

  // Designers with no projects go into a special "free" column
  const assignedDesignerIds = new Set(dpRows.map(r => r.dp.designerId))
  const freeDesigners = allDesigners
    .filter(d => !assignedDesignerIds.has(d.id))
    .map(d => ({
      dpId: null,
      designerId: d.id,
      designerName: d.name,
      designerInitials: d.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
      designerPhone: d.phone,
      designerEmail: d.email,
      designerCity: d.city,
      projectTitle: null,
      projectSlug: null,
      projectStatus: null,
      area: null,
      totalPrice: null,
      status: 'free' as const,
      notes: null,
      stats: { total: 0, done: 0, overdue: 0, cancelled: 0, inProgress: 0, nearDeadline: 0 },
      progress: 0,
      alerts: !d.phone && !d.email ? ['нет контактов'] : [],
    }))

  return {
    columns: {
      free: freeDesigners,
      draft: columns.draft,
      active: columns.active,
      review: columns.review,
      completed: columns.completed,
      paused: columns.paused,
    },
    total: allDesigners.length,
  }
})
