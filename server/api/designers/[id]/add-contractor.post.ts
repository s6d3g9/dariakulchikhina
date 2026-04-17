import {
  addContractorLink,
  AddContractorLinkSchema,
} from '~/server/modules/designers/designers.service'

/**
 * POST /api/designers/[id]/add-contractor — link a contractor to one
 * of the designer's projects with an optional role label.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, AddContractorLinkSchema)
  return await addContractorLink(body)
})
