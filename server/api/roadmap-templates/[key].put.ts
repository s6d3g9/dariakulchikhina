import { CreateRoadmapTemplateSchema } from '~/shared/types/roadmap-template'
import { ROADMAP_TEMPLATES } from '~/shared/types/roadmap-templates'
import { updateCustomRoadmapTemplate } from '~/server/utils/roadmap-templates'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const key = getRouterParam(event, 'key') || ''
  if (!key) throw createError({ statusCode: 400, statusMessage: 'Missing key' })
  if (ROADMAP_TEMPLATES.some(t => t.key === key)) {
    throw createError({ statusCode: 400, statusMessage: 'Built-in template cannot be edited' })
  }
  const body = await readValidatedNodeBody(event, CreateRoadmapTemplateSchema)
  const updated = await updateCustomRoadmapTemplate(key, body)
  if (!updated) throw createError({ statusCode: 404, statusMessage: 'Template not found' })
  return updated
})
