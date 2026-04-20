import { defineEndpoint } from '~/server/utils/define-endpoint'
import { createManager, CreateManagerSchema } from '~/server/modules/managers/managers.service'
import { UnauthorizedError } from '~/server/utils/errors'

/**
 * POST /api/managers — create a new manager row.
 *
 * Migrated to defineEndpoint (wave28-8). Behaviour identical to original.
 */
export default defineEndpoint({
  auth: 'required',
  input: CreateManagerSchema,
  async handler({ session, input }) {
    if (session?.role !== 'admin') throw new UnauthorizedError()
    return createManager(input)
  },
})
