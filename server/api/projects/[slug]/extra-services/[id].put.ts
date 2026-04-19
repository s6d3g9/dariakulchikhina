import {
  updateProjectExtraService,
  UpdateExtraServiceSchema,
} from '~/server/modules/projects/project-extra-services.service'

/**
 * PUT /api/projects/[slug]/extra-services/[id] — role-based partial
 * update. See service for the admin vs client field whitelist.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const serviceId = Number(getRouterParam(event, 'id'))
  const auth = requireAdminOrClient(event, slug)
  if (!Number.isFinite(serviceId)) {
    throw createError({ statusCode: 400, message: 'Invalid service id' })
  }
  const body = await readValidatedNodeBody(event, UpdateExtraServiceSchema)
  return await updateProjectExtraService(slug, serviceId, { role: auth.role }, body)
})
