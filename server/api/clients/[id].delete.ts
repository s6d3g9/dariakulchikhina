import { deleteClient } from '~/server/modules/clients/clients.service'

/**
 * DELETE /api/clients/[id] — removes the row and scrubs every stale
 * `client_id` / `client_ids[]` reference from `projects.profile` JSON.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid client id' })
  }
  await deleteClient(id)
  return { ok: true }
})
