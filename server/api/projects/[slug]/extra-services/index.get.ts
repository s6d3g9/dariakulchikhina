import { listProjectExtraServices } from '~/server/modules/projects/project-extra-services-api.service'

/**
 * GET /api/projects/[slug]/extra-services — all extra-services for the
 * project. Clients see the list with adminNotes blanked out.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const auth = requireAdminOrClient(event, slug)
  return await listProjectExtraServices(slug, { role: auth.role })
})
