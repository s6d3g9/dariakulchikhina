import {
  removeLink,
  RemoveLinkSchema,
} from '~/server/modules/designers/designers.service'

/**
 * POST /api/designers/[id]/remove-link — remove a client or contractor
 * link by its link-row id.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, RemoveLinkSchema)
  await removeLink(body)
  return { ok: true }
})
