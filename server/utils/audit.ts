/**
 * Audit logging helper (M5 security).
 *
 * Writes records to audit_logs table fire-and-forget — never throws,
 * never blocks the request. Import only on the server side.
 *
 * Usage:
 *   import { logAudit } from '~/server/utils/audit'
 *   logAudit(event, { action: 'login', entityType: 'user', userId: 1, role: 'admin' })
 */
import type { H3Event } from 'h3'
import { useDb } from '~/server/db/index'
import { auditLogs } from '~/server/db/schema'
import { getClientIp, getAdminSession, getClientSession, getContractorSession } from './auth'

export interface AuditOptions {
  /** Тип действия: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | ... */
  action: string
  /** Тип сущности: 'project' | 'contractor' | 'client' | 'material' | ... */
  entityType?: string
  /** Идентификатор сущности */
  entityId?: string | number
  /** Дополнительные данные */
  details?: Record<string, unknown>
  /** Явный userId (если уже знаем, переопределяет авто-определение из сессии) */
  userId?: number | null
  /** Явная роль */
  role?: string | null
}

/**
 * Записать аудит-лог. Fire-and-forget — никогда не бросает исключение.
 * Автоматически берёт IP и роль из текущей сессии, если не передано явно.
 */
export function logAudit(event: H3Event | null, opts: AuditOptions): void {
  // fire-and-forget — не ждём Promise
  ;(async () => {
    try {
      const db = useDb()
      const ip = event ? getClientIp(event) : null

      let userId = opts.userId ?? null
      let role   = opts.role   ?? null

      // Авто-определяем из сессии
      if (event && userId === null && role === null) {
        const admin = getAdminSession(event)
        if (admin) { userId = admin.userId; role = 'admin' }
        else {
          const slug = getClientSession(event)
          if (slug) { role = 'client' }
          else {
            const cid = getContractorSession(event)
            if (cid) { userId = cid; role = 'contractor' }
          }
        }
      }

      await db.insert(auditLogs).values({
        userId:     userId ?? undefined,
        role:       role ?? undefined,
        action:     opts.action,
        entityType: opts.entityType ?? undefined,
        entityId:   opts.entityId != null ? String(opts.entityId) : undefined,
        details:    opts.details ?? {},
        ip:         ip ?? undefined,
      })
    } catch (err) {
      // Аудит никогда не должен ронять запрос
      console.error('[audit] Failed to write audit log:', err)
    }
  })()
}
