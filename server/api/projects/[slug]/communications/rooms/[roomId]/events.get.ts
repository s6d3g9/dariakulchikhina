import { relayProjectCommunicationEventStream } from '~/server/modules/communications/project-communications-relay.service'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const roomId = getRouterParam(event, 'roomId')
  if (!slug || !roomId) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug and roomId are required' })
  }

  await relayProjectCommunicationEventStream(event, slug, roomId)
})