import { listDesigners } from '~/server/modules/designers/designers.service'

/**
 * GET /api/designers — admin list of designers with normalized
 * services/packages/subscriptions JSONB columns.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return await listDesigners()
})
