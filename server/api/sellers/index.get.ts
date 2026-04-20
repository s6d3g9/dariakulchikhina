import { z } from 'zod'
import { defineEndpoint } from '~/server/utils/define-endpoint'
import { listSellers } from '~/server/modules/sellers/sellers.service'
import { UnauthorizedError } from '~/server/utils/errors'

/**
 * GET /api/sellers?projectSlug=<slug> — admin list. With projectSlug
 * returns only sellers linked to that project.
 *
 * Demo rewrite via defineEndpoint (wave28-2). Behaviour identical to original.
 */
export default defineEndpoint({
  auth: 'required',
  query: z.object({ projectSlug: z.string().optional() }),
  async handler({ session, query }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    return listSellers({ projectSlug: (query.projectSlug as string) || undefined })
  },
})
