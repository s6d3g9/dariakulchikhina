import type { CommunicationSignalResponse } from '~/shared/types/communications'
import { CommunicationCreateSignalDtoSchema } from '~/shared/types/communications'
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

  const body = await readValidatedBody(event, CommunicationCreateSignalDtoSchema.parse)
  const data = await relayProjectCommunicationJson<CommunicationSignalResponse>(event, slug, {
    method: 'POST',
    path: `/v1/rooms/${roomId}/signals`,
    body,
  })

  return createApiV1CommunicationRelayEnvelope(event, data, 'client-communications-signal')
})
