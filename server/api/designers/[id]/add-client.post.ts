import {
  addClientLink,
  AddClientLinkSchema,
} from '~/server/modules/designers/designers.service'

/**
 * POST /api/designers/[id]/add-client — link a client to one of the
 * designer's projects.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, AddClientLinkSchema)
  return await addClientLink(body)
})
