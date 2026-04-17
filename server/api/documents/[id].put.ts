import {
  updateDocument,
  UpdateDocumentSchema,
} from '~/server/modules/documents/documents.service'

/**
 * PUT /api/documents/[id] — partial update. Only fields present in the
 * body are changed.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400 })

  const body = await readValidatedNodeBody(event, UpdateDocumentSchema)
  const doc = await updateDocument(id, body)
  if (!doc) throw createError({ statusCode: 404 })
  return doc
})
