import { listDesignerDocuments } from '~/server/modules/designers/designer-documents.service'

/**
 * GET /api/designers/[id]/documents — list documents filed under the
 * designer (category column encoded as `designer:<id>:<kind>`).
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const designerId = Number(getRouterParam(event, 'id'))
  if (!designerId || !Number.isFinite(designerId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })
  }
  return await listDesignerDocuments(designerId)
})
