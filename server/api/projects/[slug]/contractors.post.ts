import {
  addContractorToProject,
  AddContractorSchema,
} from '~/server/modules/projects/project-partners.service'

/**
 * POST /api/projects/[slug]/contractors — link a contractor to the
 * project (idempotent).
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const { contractorId } = await readValidatedNodeBody(event, AddContractorSchema)
  return await addContractorToProject(slug, contractorId)
})
