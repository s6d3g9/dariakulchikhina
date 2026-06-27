import { requireAdmin } from '~/server/utils/auth'
import { readValidatedNodeBody } from '~/server/utils/body'
import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { updateProjectGovernanceAssignment } from '~/server/modules/projects/project-governance.service'
import { UpdateProjectScopeAssignmentSchema } from '~/shared/types/project/project-governance'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  applyMessengerCors(event, { methods: ['PATCH', 'OPTIONS'] })
  requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const assignmentId = requireIntParam(event, 'assignmentId')
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный assignmentId' })
  }

  const body = await readValidatedNodeBody(event, UpdateProjectScopeAssignmentSchema)
  if (!Object.keys(body).length) {
    throw createError({ statusCode: 400, statusMessage: 'Нет данных для обновления назначения' })
  }

  const result = await updateProjectGovernanceAssignment(slug, assignmentId, body)

  return {
    ok: true,
    ...result,
  }
})