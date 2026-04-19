import { requireAdmin } from '~/server/modules/auth/session.service'
import { readValidatedNodeBody } from '~/server/utils/body'
import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { createProjectGovernanceAssignment } from '~/server/modules/projects/project-governance.service'
import { CreateProjectScopeAssignmentSchema } from '~/shared/types/project-governance'

export default defineEventHandler(async (event) => {
  applyMessengerCors(event, { methods: ['POST', 'OPTIONS'] })
  const admin = requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const body = await readValidatedNodeBody(event, CreateProjectScopeAssignmentSchema)
  const result = await createProjectGovernanceAssignment(slug, body, {
    assignedBy: body.assignedBy || `admin:${admin.userId}`,
  })

  return {
    ok: true,
    ...result,
  }
})