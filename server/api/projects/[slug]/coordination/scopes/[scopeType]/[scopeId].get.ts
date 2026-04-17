import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { requireAdminOrClient } from '~/server/utils/auth'
import { buildProjectScopeDetail, getProjectGovernanceProject } from '~/server/modules/projects/project-governance.service'
import { ProjectScopeTypeSchema } from '~/shared/types/project-governance'

export default defineEventHandler(async (event) => {
  applyMessengerCors(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  requireAdminOrClient(event, slug)

  const scopeType = ProjectScopeTypeSchema.parse(getRouterParam(event, 'scopeType'))
  const scopeId = getRouterParam(event, 'scopeId')
  if (!scopeId) {
    throw createError({ statusCode: 400, statusMessage: 'Scope id is required' })
  }

  const project = await getProjectGovernanceProject(slug)
  if (!project) {
    throw createError({ statusCode: 404, statusMessage: 'Проект не найден' })
  }

  const detail = await buildProjectScopeDetail(project, scopeType, decodeURIComponent(scopeId))
  if (!detail) {
    throw createError({ statusCode: 404, statusMessage: 'Контур проекта не найден' })
  }

  return detail
})