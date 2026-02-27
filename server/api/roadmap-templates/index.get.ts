import { listRoadmapTemplates } from '~/server/utils/roadmap-templates'

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  return listRoadmapTemplates()
})
