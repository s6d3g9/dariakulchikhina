import {
  updateClientProfile,
  ClientProfileSchema,
} from '~/server/modules/projects/project-mutations.service'

/**
 * PUT /api/projects/[slug]/client-profile — admin or the project's
 * client can edit the whitelisted profile fields.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  requireAdminOrClient(event, slug)
  const body = await readValidatedNodeBody(event, ClientProfileSchema)
  const result = await updateClientProfile(slug, body)
  if (!result) throw createError({ statusCode: 404, message: 'Project not found' })
  return result
})
