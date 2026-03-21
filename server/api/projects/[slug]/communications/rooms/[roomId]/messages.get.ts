import type { CommunicationMessagesResponse } from '~/shared/types/communications'
import { CommunicationListMessagesQuerySchema } from '~/shared/types/communications'
import { safeGetQuery } from '~/server/utils/query'
import { relayProjectCommunicationJson } from '~/server/utils/project-communications-relay'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const roomId = getRouterParam(event, 'roomId')
  if (!slug || !roomId) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug and roomId are required' })
  }

  const query = CommunicationListMessagesQuerySchema.parse(safeGetQuery(event))
  const suffix = query.limit ? `?limit=${query.limit}` : ''
  return await relayProjectCommunicationJson<CommunicationMessagesResponse>(event, slug, {
    path: `/v1/rooms/${roomId}/messages${suffix}`,
  })
})