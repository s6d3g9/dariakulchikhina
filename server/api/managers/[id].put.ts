import {
  updateManager,
  UpdateManagerSchema,
} from '~/server/modules/managers/managers.service'

/**
 * PUT /api/managers/[id] — partial update.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid manager id' })
  }
  const body = await readValidatedNodeBody(event, UpdateManagerSchema)
  const updated = await updateManager(id, body)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Manager not found' })
  return updated
})
