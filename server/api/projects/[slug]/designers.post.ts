import {
  addDesignerToProject,
  AddDesignerSchema,
} from '~/server/modules/projects/project-partners.service'

/**
 * POST /api/projects/[slug]/designers — link a designer to the project
 * (idempotent via unique key on designerProjects).
 */
export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')!
  const { designerId } = await readValidatedNodeBody(event, AddDesignerSchema)
  return await addDesignerToProject(slug, designerId)
})
