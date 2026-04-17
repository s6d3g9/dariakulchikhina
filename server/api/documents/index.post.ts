import {
  createDocument,
  CreateDocumentSchema,
} from '~/server/modules/documents/documents.service'

/**
 * POST /api/documents — create a new document row.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateDocumentSchema)
  return await createDocument(body)
})
