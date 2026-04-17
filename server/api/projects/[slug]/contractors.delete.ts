import {
  removeContractorFromProject,
  AddContractorSchema,
} from '~/server/modules/projects/project-partners.service'

/**
 * DELETE /api/projects/[slug]/contractors — unlink by body.contractorId.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const { contractorId } = await readValidatedNodeBody(event, AddContractorSchema)
  return await removeContractorFromProject(slug, contractorId)
})
