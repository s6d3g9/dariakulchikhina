import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { listDocuments } from '~/server/modules/documents/documents.service'
import { UnauthorizedError } from '~/server/utils/errors'

export default defineEndpoint({
  auth: 'required',
  query: z.object({
    category: z.string().optional(),
    projectSlug: z.string().optional(),
  }),
  async handler({ session, query }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    return listDocuments({
      category: (query.category as string) || undefined,
      projectSlug: (query.projectSlug as string) || undefined,
    })
  },
})
