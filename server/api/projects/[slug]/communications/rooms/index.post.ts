import type { CommunicationRoomResponse } from '~/shared/types/communications'
import { CommunicationCreateRoomDtoSchema } from '~/shared/types/communications'
import { relayProjectCommunicationJson } from '~/server/utils/project-communications-relay'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const body = await readValidatedBody(event, CommunicationCreateRoomDtoSchema.parse)
  return await relayProjectCommunicationJson<CommunicationRoomResponse>(event, slug, {
    method: 'POST',
    path: '/v1/rooms',
    body,
  })
})