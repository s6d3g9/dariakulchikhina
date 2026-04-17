import type { CommunicationRoomsResponse } from '~/shared/types/communications'
import { CommunicationListRoomsQuerySchema } from '~/shared/types/communications'
import { safeGetQuery } from '~/server/utils/query'
import { relayProjectCommunicationJson } from '~/server/modules/communications/project-communications-relay.service'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }

  const query = CommunicationListRoomsQuerySchema.parse(safeGetQuery(event))
  const search = new URLSearchParams()
  if (query.kind) {
    search.set('kind', query.kind)
  }
  if (query.externalRefPrefix) {
    search.set('externalRefPrefix', query.externalRefPrefix)
  }

  const suffix = search.size ? `?${search.toString()}` : ''
  return await relayProjectCommunicationJson<CommunicationRoomsResponse>(event, slug, {
    path: `/v1/rooms${suffix}`,
  })
})