import {
  removeDesignerFromProject,
  AddDesignerSchema,
} from '~/server/modules/projects/project-partners.service'

/**
 * DELETE /api/projects/[slug]/designers — unlink by body.designerId.
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const { designerId } = await readValidatedNodeBody(event, AddDesignerSchema)
  return await removeDesignerFromProject(slug, designerId)
})
