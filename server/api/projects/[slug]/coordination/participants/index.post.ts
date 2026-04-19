import { requireAdmin } from '~/server/modules/auth/session.service'
import { readValidatedNodeBody } from '~/server/utils/body'
import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { createProjectGovernanceParticipant } from '~/server/modules/projects/project-governance.service'
import { CreateProjectParticipantSchema } from '~/shared/types/project-governance'

export default defineEventHandler(async (event) => {
  applyMessengerCors(event, { methods: ['POST', 'OPTIONS'] })
  requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const body = await readValidatedNodeBody(event, CreateProjectParticipantSchema)
  const result = await createProjectGovernanceParticipant(slug, body)

  return {
    ok: true,
    ...result,
  }
})