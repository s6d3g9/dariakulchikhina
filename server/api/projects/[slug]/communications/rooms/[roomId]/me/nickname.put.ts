import type { CommunicationRoomResponse } from '~/shared/types/communications'
import { CommunicationUpdateNicknameDtoSchema } from '~/shared/types/communications'
import { relayProjectCommunicationJson } from '~/server/modules/communications/project-communications-relay.service'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const roomId = getRouterParam(event, 'roomId')
  if (!slug || !roomId) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug and roomId are required' })
  }

  const body = await readValidatedBody(event, CommunicationUpdateNicknameDtoSchema.parse)
  return await relayProjectCommunicationJson<CommunicationRoomResponse>(event, slug, {
    method: 'PUT',
    path: `/v1/rooms/${roomId}/me/nickname`,
    body,
  })
})