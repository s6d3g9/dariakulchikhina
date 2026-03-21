import type { CommunicationMessage } from '~/shared/types/communications'
import { CommunicationCreateMessageDtoSchema } from '~/shared/types/communications'
import { relayProjectCommunicationJson } from '~/server/utils/project-communications-relay'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const roomId = getRouterParam(event, 'roomId')
  if (!slug || !roomId) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug and roomId are required' })
  }

  const body = await readValidatedBody(event, CommunicationCreateMessageDtoSchema.parse)
  return await relayProjectCommunicationJson<{ message: CommunicationMessage }>(event, slug, {
    method: 'POST',
    path: `/v1/rooms/${roomId}/messages`,
    body,
  })
})