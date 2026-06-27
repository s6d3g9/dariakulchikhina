import { requireAdmin } from '~/server/utils/auth'
import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { deleteProjectGovernanceAssignment } from '~/server/modules/projects/project-governance.service'
import { requireIntParam } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  applyMessengerCors(event, { methods: ['DELETE', 'OPTIONS'] })
  requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const assignmentId = requireIntParam(event, 'assignmentId')
  if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный assignmentId' })
  }

  const result = await deleteProjectGovernanceAssignment(slug, assignmentId)

  return {
    ok: true,
    ...result,
  }
})