import {
  updateProjectStatus,
  UpdateProjectStatusSchema,
} from '~/server/modules/projects/project-mutations.service'

/**
 * PUT /api/projects/[slug]/status — narrow status transition. The
 * enum of allowed values comes from shared/types/catalogs.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, UpdateProjectStatusSchema)
  const updated = await updateProjectStatus(slug, body)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  return updated
})
