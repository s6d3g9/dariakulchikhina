import { CreateRoadmapTemplateSchema } from '~/shared/types/roadmap-template'
import { createCustomRoadmapTemplate } from '~/server/utils/roadmap-templates'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedNodeBody(event, CreateRoadmapTemplateSchema)
  return createCustomRoadmapTemplate(body)
})
