import {
  createDesignerProject,
  CreateDesignerProjectSchema,
} from '~/server/modules/designers/designers.service'

/**
 * POST /api/designers/[id]/create-project — create or reuse a project
 * row by slug and link it to the designer. Returns { designerProject,
 * project }.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const routeDesignerId = Number(getRouterParam(event, 'id'))
  if (!routeDesignerId || !Number.isFinite(routeDesignerId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid designer id' })
  }
  const body = await readValidatedNodeBody(event, CreateDesignerProjectSchema)
  return await createDesignerProject(routeDesignerId, body)
})
