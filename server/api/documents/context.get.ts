import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { getDocumentContext } from '~/server/modules/documents/documents.service'
import { UnauthorizedError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  query: z.object({ projectSlug: z.string().optional() }),
  async handler({ session, query }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    return getDocumentContext((query.projectSlug as string) || '')
  },
})
