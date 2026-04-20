import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { getDocument } from '~/server/modules/documents/documents.service'
import { UnauthorizedError, NotFoundError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'optional',
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  async handler({ session, params }) {
    if (!session || (session.role !== 'admin' && session.role !== 'client')) {
      throw new UnauthorizedError()
    }
    const doc = await getDocument(Number(params.id))
    if (!doc) throw new NotFoundError('Document', params.id)
    return doc
  },
})
