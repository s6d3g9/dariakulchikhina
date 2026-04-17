import {
  createClient,
  CreateClientSchema,
} from '~/server/modules/clients/clients.service'

/**
 * POST /api/clients — create a new client row.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateClientSchema)
  return await createClient(body)
})
