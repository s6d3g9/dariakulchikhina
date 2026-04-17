import { UpdateProjectSchema } from '~/shared/types/project/project'
import { updateProject } from '~/server/modules/projects/project-mutations.service'

/**
 * PUT /api/projects/[slug] — full-object update (UpdateProjectSchema
 * enforces the allowed field set).
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const body = await readValidatedNodeBody(event, UpdateProjectSchema)
  const updated = await updateProject(slug, body)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Project not found' })
  return updated
})
