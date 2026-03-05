/**
 * GET /api/admin/notifications
 * Возвращает счётчики для badge уведомлений в шапке.
 */
import { useDb } from '~/server/db/index'
import { projects, projectExtraServices, workStatusItems } from '~/server/db/schema'
import { sql, eq, and, not, inArray, lt, isNotNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()

  // 1. Новые заявки на доп. услуги от клиентов
  const [extraRow] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(projectExtraServices)
    .where(eq(projectExtraServices.status, 'requested'))

  // 2. Просроченные задачи из work_status_items
  const today = new Date().toISOString().slice(0, 10)
  const [overdueRow] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(workStatusItems)
    .where(
      and(
        not(inArray(workStatusItems.status, ['done', 'cancelled'])),
        isNotNull(workStatusItems.dateEnd),
        lt(workStatusItems.dateEnd, today),
      )
    )

  const extraCount   = extraRow?.count   || 0
  const overdueCount = overdueRow?.count || 0
  const total        = extraCount + overdueCount

  return {
    total,
    extra:   { count: extraCount,   label: 'новые заявки на доп. услуги' },
    overdue: { count: overdueCount, label: 'просроченные задачи' },
  }
})
