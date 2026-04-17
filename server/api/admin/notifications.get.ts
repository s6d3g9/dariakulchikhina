import { getAdminNotifications } from '~/server/modules/admin/admin-notifications.service'

/**
 * GET /api/admin/notifications — counters for the admin header badge.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return await getAdminNotifications()
})
