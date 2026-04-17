import { removeContractorFromProject } from '~/server/modules/projects/project-partners.service'

/**
 * DELETE /api/projects/[slug]/contractors/[contractorId] — unlink by
 * URL param.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const contractorId = Number(getRouterParam(event, 'contractorId'))
  if (!contractorId) throw createError({ statusCode: 400 })
  return await removeContractorFromProject(slug, contractorId)
})
