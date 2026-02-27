import { ROADMAP_TEMPLATES } from '~/shared/types/roadmap-templates'
import { deleteCustomRoadmapTemplate } from '~/server/utils/roadmap-templates'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const key = getRouterParam(event, 'key') || ''
  if (!key) throw createError({ statusCode: 400, statusMessage: 'Missing key' })
  if (ROADMAP_TEMPLATES.some(t => t.key === key)) {
    throw createError({ statusCode: 400, statusMessage: 'Built-in template cannot be removed' })
  }
  const removed = await deleteCustomRoadmapTemplate(key)
  if (!removed) throw createError({ statusCode: 404, statusMessage: 'Template not found' })
  return { ok: true }
})
