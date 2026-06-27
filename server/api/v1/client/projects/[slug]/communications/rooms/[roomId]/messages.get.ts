import type { CommunicationMessagesResponse } from '~/shared/types/communications'
import { CommunicationListMessagesQuerySchema } from '~/shared/types/communications'
import { relayProjectCommunicationJson } from '~/server/modules/communications/communications-relay.service'
import {
  createApiV1CommunicationRelayEnvelope,
  getRequiredApiV1CommunicationRoomId,
  getRequiredApiV1ProjectSlug,
} from '~/server/utils/api-v1-client-communications-relay'
import { requireAdminOrClient } from '~/server/utils/auth'
import { safeGetQuery } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  const slug = getRequiredApiV1ProjectSlug(event)
  const roomId = getRequiredApiV1CommunicationRoomId(event)
  requireAdminOrClient(event, slug)

  const query = CommunicationListMessagesQuerySchema.parse(safeGetQuery(event))
  const suffix = query.limit ? `?limit=${query.limit}` : ''
  const data = await relayProjectCommunicationJson<CommunicationMessagesResponse>(event, slug, {
    path: `/v1/rooms/${roomId}/messages${suffix}`,
  })

  return createApiV1CommunicationRelayEnvelope(event, data, 'client-communications-messages')
})
