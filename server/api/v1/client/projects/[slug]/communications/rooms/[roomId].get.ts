import type { CommunicationRoomResponse } from '~/shared/types/communications'
import { relayProjectCommunicationJson } from '~/server/modules/communications/communications-relay.service'
import {
  createApiV1CommunicationRelayEnvelope,
  getRequiredApiV1CommunicationRoomId,
  getRequiredApiV1ProjectSlug,
} from '~/server/utils/api-v1-client-communications-relay'
import { requireAdminOrClient } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const slug = getRequiredApiV1ProjectSlug(event)
  const roomId = getRequiredApiV1CommunicationRoomId(event)
  requireAdminOrClient(event, slug)

  const data = await relayProjectCommunicationJson<CommunicationRoomResponse>(event, slug, {
    path: `/v1/rooms/${roomId}`,
  })

  return createApiV1CommunicationRelayEnvelope(event, data, 'client-communications-room')
})
