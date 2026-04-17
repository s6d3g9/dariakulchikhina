import {
  removeSellerFromProject,
  AddSellerSchema,
} from '~/server/modules/projects/project-partners.service'

/**
 * DELETE /api/projects/[slug]/sellers — unlink by body.sellerId.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const { sellerId } = await readValidatedNodeBody(event, AddSellerSchema)
  return await removeSellerFromProject(slug, sellerId)
})
