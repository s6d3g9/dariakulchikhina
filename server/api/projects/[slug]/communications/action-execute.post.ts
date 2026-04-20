import { requireAdmin } from '~/server/modules/auth/session.service'
import { readValidatedNodeBody } from '~/server/utils/body'
import { executeProjectCommunicationAction } from '~/server/modules/projects/project-comms-actions.service'
import { applyMessengerCors } from '~/server/utils/messenger-cors'
import { ProjectCommsActionBodySchema } from '~/shared/types/project-comms-actions'

export default defineEventHandler(async (event) => {
  applyMessengerCors(event, { methods: ['POST', 'OPTIONS'] })
  requireAdmin(event)
  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  const body = await readValidatedNodeBody(event, ProjectCommsActionBodySchema)
  const result = await executeProjectCommunicationAction(slug, body.actionId, body.payload)
  return { ok: true, message: result.message, mutation: result.mutation }
})
