import { relayProjectCommunicationEventStream } from '~/server/modules/communications/communications-relay.service'
import {
  getRequiredApiV1CommunicationRoomId,
  getRequiredApiV1ProjectSlug,
} from '~/server/utils/api-v1-client-communications-relay'
import { requireAdminOrClient } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const slug = getRequiredApiV1ProjectSlug(event)
  const roomId = getRequiredApiV1CommunicationRoomId(event)
  requireAdminOrClient(event, slug)

  await relayProjectCommunicationEventStream(event, slug, roomId)
})
