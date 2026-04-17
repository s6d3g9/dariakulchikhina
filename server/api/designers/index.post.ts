import {
  createDesigner,
  CreateDesignerSchema,
} from '~/server/modules/designers/designers.service'

/**
 * POST /api/designers — create a new designer row.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateDesignerSchema)
  return await createDesigner(body)
})
