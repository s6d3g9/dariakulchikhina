import { listClientDocuments } from '~/server/modules/clients/clients.service'

/**
 * GET /api/clients/[id]/documents — list documents filed under the
 * client (documents.category encoded as `client:<id>:<kind>`).
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const clientId = Number(getRouterParam(event, 'id'))
  if (!clientId || !Number.isFinite(clientId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid client id' })
  }
  return await listClientDocuments(clientId)
})
