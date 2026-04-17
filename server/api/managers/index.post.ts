import {
  createManager,
  CreateManagerSchema,
} from '~/server/modules/managers/managers.service'

/**
 * POST /api/managers — create a new manager row.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateManagerSchema)
  return await createManager(body)
})
