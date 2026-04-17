import { listClients } from '~/server/modules/clients/clients.service'

/**
 * GET /api/clients?projectSlug=<slug>
 * Returns every client with an attached `linkedProjects` array derived
 * from `projects.profile`. Filter by `projectSlug` to get only clients
 * linked to a single project.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const query = safeGetQuery(event)
  return await listClients({
    projectSlug: (query.projectSlug as string) || undefined,
  })
})
