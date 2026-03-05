import { useDb } from '~/server/db/index'
import { workStatusItems } from '~/server/db/schema'
import { sql, and, gte, lte } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const db = useDb()
  const period = (getQuery(event).period as string) || 'all'

  const today = new Date().toISOString().slice(0, 10)
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)
  const monthStart = today.slice(0, 8) + '01'

  // Build optional date filter on dateEnd
  let dateFilter: any = undefined
  if (period === 'today') {
    dateFilter = and(
      sql`${workStatusItems.dateEnd} = ${today}`,
    )
  } else if (period === 'week') {
    dateFilter = and(
      sql`${workStatusItems.dateEnd} >= ${weekAgo}`,
      sql`${workStatusItems.dateEnd} <= ${today}`,
    )
  } else if (period === 'month') {
    dateFilter = and(
      sql`${workStatusItems.dateEnd} >= ${monthStart}`,
      sql`${workStatusItems.dateEnd} <= ${today}`,
    )
  }

  const whereClause = dateFilter ?? sql`1=1`

  const [row] = await db
    .select({
      total:     sql<number>`cast(count(*) as int)`,
      done:      sql<number>`cast(sum(case when ${workStatusItems.status} = 'done' then 1 else 0 end) as int)`,
      overdue:   sql<number>`cast(sum(case when ${workStatusItems.status} not in ('done','cancelled') and ${workStatusItems.dateEnd} is not null and ${workStatusItems.dateEnd} < ${today} then 1 else 0 end) as int)`,
      cancelled: sql<number>`cast(sum(case when ${workStatusItems.status} = 'cancelled' then 1 else 0 end) as int)`,
      inProgress:sql<number>`cast(sum(case when ${workStatusItems.status} not in ('done','cancelled') and (${workStatusItems.dateEnd} is null or ${workStatusItems.dateEnd} >= ${today}) then 1 else 0 end) as int)`,
    })
    .from(workStatusItems)
    .where(whereClause)

  return {
    period,
    total:      row?.total      ?? 0,
    done:       row?.done       ?? 0,
    overdue:    row?.overdue    ?? 0,
    cancelled:  row?.cancelled  ?? 0,
    inProgress: row?.inProgress ?? 0,
  }
})
