import {
  updateDesigner,
  UpdateDesignerSchema,
} from '~/server/modules/designers/designers.service'

/**
 * PUT /api/designers/[id] — partial update of a designer. Optionally
 * clears packageKey on selected designer projects in the same tx.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })
  }

  const body = await readValidatedNodeBody(event, UpdateDesignerSchema)
  const updated = await updateDesigner(id, body)
  if (!updated) {
    throw createError({ statusCode: 404, statusMessage: 'Designer not found' })
  }
  return updated
})
