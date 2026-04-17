import {
  updateDesignerProject,
  UpdateDesignerProjectSchema,
} from '~/server/modules/designers/designers.service'

/**
 * PUT /api/designers/[id]/project — partial update of a designer-project
 * pairing. A `title` change propagates to the underlying `projects` row.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const designerId = Number(getRouterParam(event, 'id'))
  if (!designerId || !Number.isFinite(designerId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })
  }
  const body = await readValidatedNodeBody(event, UpdateDesignerProjectSchema)
  return await updateDesignerProject(designerId, body)
})
