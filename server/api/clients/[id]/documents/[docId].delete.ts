import { deleteClientDocument } from '~/server/modules/clients/clients.service'

/**
 * DELETE /api/clients/[id]/documents/[docId] — remove a client-scoped
 * document. Verifies the doc belongs to this client via the
 * `client:<id>:` category prefix before deletion.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const clientId = Number(getRouterParam(event, 'id'))
  const docId = Number(getRouterParam(event, 'docId'))
  if (!clientId || !Number.isFinite(clientId) || !docId || !Number.isFinite(docId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid params' })
  }

  const deleted = await deleteClientDocument(clientId, docId)
  if (!deleted) throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  return { ok: true }
})
