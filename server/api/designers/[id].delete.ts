import { deleteDesigner } from '~/server/modules/designers/designers.service'

/**
 * DELETE /api/designers/[id] — remove a designer. Cascades via FK to
 * designerProjects / designerProjectClients / designerProjectContractors.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id || !Number.isFinite(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })
  }
  await deleteDesigner(id)
  return { ok: true }
})
