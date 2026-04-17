import { getDocument } from '~/server/modules/documents/documents.service'

/**
 * GET /api/documents/[id]
 * Returns the document by id. Admin or an authenticated client session
 * can access it.
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) {
    throw createError({ statusCode: 400, message: 'Invalid id' })
  }

  const admin = getAdminSession(event)
  const client = getClientSession(event)
  if (!admin && !client) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const doc = await getDocument(id)
  if (!doc) throw createError({ statusCode: 404, message: 'Document not found' })
  return doc
})
