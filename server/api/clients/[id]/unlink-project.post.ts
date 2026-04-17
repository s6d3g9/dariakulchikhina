import {
  unlinkClientFromProject,
  LinkProjectSchema,
} from '~/server/modules/clients/clients.service'

/**
 * POST /api/clients/[id]/unlink-project — detach this client from the
 * given project. If this was the primary client, the next id in
 * `client_ids[]` is promoted, otherwise denormalized client fields are
 * cleared.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const clientId = Number(getRouterParam(event, 'id'))
  const { projectSlug } = await readValidatedNodeBody(event, LinkProjectSchema)
  return await unlinkClientFromProject(clientId, projectSlug)
})
