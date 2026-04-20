import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { deleteDocument } from '~/server/modules/documents/documents.service'
import { UnauthorizedError, NotFoundError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  params: z.object({ id: z.string().regex(/^\d+$/) }),
  async handler({ session, params }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    const deleted = await deleteDocument(Number(params.id))
    if (!deleted) throw new NotFoundError('Document', params.id)
    return { ok: true }
  },
})
