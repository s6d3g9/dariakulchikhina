import type { CommunicationRoomsResponse } from '~/shared/types/communications'
import { CommunicationListRoomsQuerySchema } from '~/shared/types/communications'
import { relayProjectCommunicationJson } from '~/server/modules/communications/communications-relay.service'
import { createApiV1CommunicationRelayEnvelope, getRequiredApiV1ProjectSlug } from '~/server/utils/api-v1-client-communications-relay'
import { requireAdminOrClient } from '~/server/utils/auth'
import { safeGetQuery } from '~/server/utils/query'

export default defineEventHandler(async (event) => {
  const slug = getRequiredApiV1ProjectSlug(event)
  requireAdminOrClient(event, slug)

  const query = CommunicationListRoomsQuerySchema.parse(safeGetQuery(event))
  const search = new URLSearchParams()
  if (query.kind) {
    search.set('kind', query.kind)
  }
  if (query.externalRefPrefix) {
    search.set('externalRefPrefix', query.externalRefPrefix)
  }

  const queryString = search.toString()
  const suffix = queryString ? `?${queryString}` : ''
  const data = await relayProjectCommunicationJson<CommunicationRoomsResponse>(event, slug, {
    path: `/v1/rooms${suffix}`,
  })

  return createApiV1CommunicationRelayEnvelope(event, data, 'client-communications-rooms')
})
