import {
  createProjectExtraService,
  CreateExtraServiceSchema,
} from '~/server/modules/projects/project-extra-services-api.service'

/**
 * POST /api/projects/[slug]/extra-services — create extra-service
 * request. Client → status=requested; admin → status=quoted.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!
  const auth = requireAdminOrClient(event, slug)
  const body = await readValidatedNodeBody(event, CreateExtraServiceSchema)
  return await createProjectExtraService(slug, { role: auth.role }, body)
})
