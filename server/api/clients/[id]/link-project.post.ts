import {
  linkClientToProject,
  LinkProjectSchema,
} from '~/server/modules/clients/clients.service'

/**
 * POST /api/clients/[id]/link-project — attach this client to a project
 * by slug. Idempotent; also denormalizes identity fields into
 * `projects.profile` for faster admin list rendering.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const clientId = Number(getRouterParam(event, 'id'))
  const { projectSlug } = await readValidatedNodeBody(event, LinkProjectSchema)
  return await linkClientToProject(clientId, projectSlug)
})
