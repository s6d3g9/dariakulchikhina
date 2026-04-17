import {
  dispatchProjectMessage,
  DispatchSchema,
} from '~/server/modules/projects/project-communications-api.service'

/**
 * POST /api/projects/[slug]/communications/dispatch — send a manual
 * message to a team member and append a log entry to
 * profile.hybridControl.communicationLog.
 */
export default defineEventHandler(async (event) => {
  const slug = event.context.params?.slug
  if (!slug) throw createError({ statusCode: 400, message: 'Missing slug' })

  const body = await readValidatedNodeBody(event, DispatchSchema)
  return await dispatchProjectMessage(slug, body)
})
