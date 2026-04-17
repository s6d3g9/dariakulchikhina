import { listContractorProjects } from '~/server/modules/contractors/contractors.service'

/**
 * GET /api/contractors/[id]/projects — projects the contractor is
 * linked to (via `project_contractors`).
 */
export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400 })

  const adminSession = getAdminSession(event)
  const contractorSession = getContractorSession(event)
  if (!adminSession && contractorSession !== id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  return await listContractorProjects(id)
})
