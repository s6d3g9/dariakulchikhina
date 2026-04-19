import { requireAdmin } from '~/server/modules/auth/session.service'
import { readValidatedNodeBody } from '~/server/utils/body'
import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { updateProjectGovernanceParticipant } from '~/server/modules/projects/project-governance.service'
import { UpdateProjectParticipantSchema } from '~/shared/types/project-governance'

export default defineEventHandler(async (event) => {
  applyMessengerCors(event, { methods: ['PATCH', 'OPTIONS'] })
  requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const participantId = Number(getRouterParam(event, 'participantId'))
  if (!Number.isInteger(participantId) || participantId <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Некорректный participantId' })
  }

  const body = await readValidatedNodeBody(event, UpdateProjectParticipantSchema)
  if (!Object.keys(body).length) {
    throw createError({ statusCode: 400, statusMessage: 'Нет данных для обновления участника' })
  }

  const result = await updateProjectGovernanceParticipant(slug, participantId, body)

  return {
    ok: true,
    ...result,
  }
})