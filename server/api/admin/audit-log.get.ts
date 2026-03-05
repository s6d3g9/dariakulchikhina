/**
 * GET /api/admin/audit-log
 *
 * Возвращает постраничный список аудит-записей.
 * Только для администратора.
 *
 * Параметры:
 *   ?page=1       — номер страницы (default 1)
 *   ?limit=50     — размер страницы (max 200)
 *   ?action=login — фильтр по типу действия
 *   ?role=admin   — фильтр по роли
 *   ?entityType=project — фильтр по типу сущности
 *   ?from=2024-01-01    — дата начала (ISO 8601)
 *   ?to=2024-12-31      — дата конца  (ISO 8601)
 */
import { and, desc, gte, lte, eq, sql } from 'drizzle-orm'
import { useDb } from '~/server/db/index'
import { auditLogs } from '~/server/db/schema'
import { requireAdmin } from '~/server/utils/auth'
import { parsePagination, paginateResult } from '~/server/utils/pagination'

export default defineEventHandler(async (event) => {
  requireAdmin(event)

  const db = useDb()
  const { page, limit } = parsePagination(event)
  const safeLimit = Math.min(limit, 200)

  const q = getQuery(event)
  const action     = typeof q.action     === 'string' ? q.action     : undefined
  const role       = typeof q.role       === 'string' ? q.role       : undefined
  const entityType = typeof q.entityType === 'string' ? q.entityType : undefined
  const from       = typeof q.from       === 'string' ? new Date(q.from) : undefined
  const to         = typeof q.to         === 'string' ? new Date(q.to)   : undefined

  const conditions = [
    action     ? eq(auditLogs.action,     action)     : undefined,
    role       ? eq(auditLogs.role,       role)       : undefined,
    entityType ? eq(auditLogs.entityType, entityType) : undefined,
    from       ? gte(auditLogs.createdAt, from)       : undefined,
    to         ? lte(auditLogs.createdAt, to)         : undefined,
  ].filter(Boolean) as ReturnType<typeof eq>[]

  const where = conditions.length ? and(...conditions) : undefined

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(auditLogs)
    .where(where)

  const data = await db
    .select()
    .from(auditLogs)
    .where(where)
    .orderBy(desc(auditLogs.createdAt))
    .limit(safeLimit)
    .offset((page - 1) * safeLimit)

  return paginateResult(data, total, page, safeLimit)
})
