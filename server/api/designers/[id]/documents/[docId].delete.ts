import { deleteDesignerDocument } from '~/server/modules/designers/designer-documents.service'

/**
 * DELETE /api/designers/[id]/documents/[docId] — remove a designer
 * document. Verifies the `designer:<id>:` prefix before deletion.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const designerId = Number(getRouterParam(event, 'id'))
  const docId = Number(getRouterParam(event, 'docId'))
  if (!designerId || !Number.isFinite(designerId) || !docId || !Number.isFinite(docId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid params' })
  }

  const deleted = await deleteDesignerDocument(designerId, docId)
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  return { ok: true }
})
