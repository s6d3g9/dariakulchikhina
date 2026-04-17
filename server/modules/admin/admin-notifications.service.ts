import { sql, eq, and, not, inArray, lt, isNotNull } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import {
  projects,
  projectExtraServices,
  workStatusItems,
} from '~/server/db/schema'
import {
  buildHybridControlSummary,
  ensureHybridControl,
} from '~/shared/utils/project-control'

export interface NotificationBadgeCount {
  count: number
  label: string
}

export interface AdminNotificationsSummary {
  total: number
  extra: NotificationBadgeCount
  overdue: NotificationBadgeCount
  control: NotificationBadgeCount
}

/**
 * Counters for the admin header notification badge. Aggregates three
 * independent signals:
 *   - new client-requested extra services (status = 'requested')
 *   - overdue work_status_items (past `date_end`, not done/cancelled)
 *   - projects whose hybrid-control health is 'critical'
 *
 * Returns already-labelled buckets so the frontend just renders them.
 */
export async function getAdminNotifications(): Promise<AdminNotificationsSummary> {
  const db = useDb()

  const [extraRow] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(projectExtraServices)
    .where(eq(projectExtraServices.status, 'requested'))

  const today = new Date().toISOString().slice(0, 10)
  const [overdueRow] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(workStatusItems)
    .where(
      and(
        not(inArray(workStatusItems.status, ['done', 'cancelled'])),
        isNotNull(workStatusItems.dateEnd),
        lt(workStatusItems.dateEnd, today),
      ),
    )

  const extraCount = extraRow?.count || 0
  const overdueCount = overdueRow?.count || 0

  const projectRows = await db
    .select({
      slug: projects.slug,
      status: projects.status,
      pages: projects.pages,
      profile: projects.profile,
    })
    .from(projects)

  const controlCount = projectRows.reduce((count, project) => {
    const control = ensureHybridControl(project.profile?.hybridControl, project)
    const summary = buildHybridControlSummary(control)
    return summary.health.status === 'critical' ? count + 1 : count
  }, 0)

  const total = extraCount + overdueCount + controlCount

  return {
    total,
    extra: { count: extraCount, label: 'новые заявки на доп. услуги' },
    overdue: { count: overdueCount, label: 'просроченные задачи' },
    control: {
      count: controlCount,
      label: 'проекты с критичным контуром контроля',
    },
  }
}
