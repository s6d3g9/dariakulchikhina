import { deleteProjectExtraService } from '~/server/modules/projects/project-extra-services.service'

/**
 * DELETE /api/projects/[slug]/extra-services/[id] — client can delete
 * only their own requested/cancelled rows; admin can delete anything.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const serviceId = Number(getRouterParam(event, 'id'))
  const auth = requireAdminOrClient(event, slug)
  if (!Number.isFinite(serviceId)) {
    throw createError({ statusCode: 400, message: 'Invalid service id' })
  }
  return await deleteProjectExtraService(slug, serviceId, { role: auth.role })
})
