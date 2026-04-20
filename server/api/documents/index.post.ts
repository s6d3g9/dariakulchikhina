import { defineEndpoint } from '~/server/utils/define-endpoint'
import { createDocument, CreateDocumentSchema, type CreateDocumentInput } from '~/server/modules/documents/documents.service'
import { UnauthorizedError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  input: CreateDocumentSchema,
  async handler({ session, input }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    return createDocument(input as CreateDocumentInput)
  },
})
