import type { CommunicationRoomResponse } from '~/shared/types/communications'
import { CommunicationCreateRoomDtoSchema } from '~/shared/types/communications'
import { relayProjectCommunicationJson } from '~/server/modules/communications/communications-relay.service'
import { createApiV1CommunicationRelayEnvelope, getRequiredApiV1ProjectSlug } from '~/server/utils/api-v1-client-communications-relay'
import { requireAdminOrClient } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const slug = getRequiredApiV1ProjectSlug(event)
  requireAdminOrClient(event, slug)

  const body = await readValidatedBody(event, CommunicationCreateRoomDtoSchema.parse)
  const data = await relayProjectCommunicationJson<CommunicationRoomResponse>(event, slug, {
    method: 'POST',
    path: '/v1/rooms',
    body,
  })

  return createApiV1CommunicationRelayEnvelope(event, data, 'client-communications-room')
})
