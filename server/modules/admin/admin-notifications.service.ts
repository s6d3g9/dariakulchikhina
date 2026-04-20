import {
  buildHybridControlSummary,
  ensureHybridControl,
} from '~/shared/utils/project-control'
import * as repo from './admin-notifications.repository'
import type { NotificationBadgeCount, AdminNotificationsSummary } from './admin.types'

export type { NotificationBadgeCount, AdminNotificationsSummary }

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
  const [extraCount, overdueCount, projectRows] = await Promise.all([
    repo.countRequestedExtraServices(),
    repo.countOverdueWorkItems(),
    repo.listProjectsForControlCheck(),
  ])

  const controlCount = projectRows.reduce((count, project) => {
    const control = ensureHybridControl(
      (project.profile as Record<string, unknown>)?.hybridControl,
      project,
    )
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
