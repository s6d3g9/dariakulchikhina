import {
  updateClient,
  UpdateClientSchema,
} from '~/server/modules/clients/clients.service'

/**
 * PUT /api/clients/[id] — full-replace update of a client row.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  const body = await readValidatedNodeBody(event, UpdateClientSchema)
  const c = await updateClient(id, body)
  if (!c) throw createError({ statusCode: 404, statusMessage: 'Client not found' })
  return c
})
