import type { CommunicationKeyBundle } from '~/shared/types/communications'
import { CommunicationPublishKeyBundleDtoSchema } from '~/shared/types/communications'
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

  const body = await readValidatedBody(event, CommunicationPublishKeyBundleDtoSchema.parse)
  const data = await relayProjectCommunicationJson<{ keyBundle: CommunicationKeyBundle }>(event, slug, {
    method: 'POST',
    path: `/v1/rooms/${roomId}/key-bundles`,
    body,
  })

  return createApiV1CommunicationRelayEnvelope(event, data, 'client-communications-key-bundle')
})
