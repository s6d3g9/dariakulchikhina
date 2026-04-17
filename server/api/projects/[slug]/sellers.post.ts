import {
  addSellerToProject,
  AddSellerSchema,
} from '~/server/modules/projects/project-partners.service'

/**
 * POST /api/projects/[slug]/sellers — link a seller (idempotent).
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const { sellerId } = await readValidatedNodeBody(event, AddSellerSchema)
  return await addSellerToProject(slug, sellerId)
})
