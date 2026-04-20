import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { updateDocument, UpdateDocumentSchema } from '~/server/modules/documents/documents.service'
import { UnauthorizedError, NotFoundError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  input: UpdateDocumentSchema,
  async handler({ session, params, input }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    const doc = await updateDocument(Number(params.id), input)
    if (!doc) throw new NotFoundError('Document', params.id)
    return doc
  },
})
