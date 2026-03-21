import type { CommunicationKeyBundlesResponse } from '~/shared/types/communications'
import { relayProjectCommunicationJson } from '~/server/utils/project-communications-relay'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const roomId = getRouterParam(event, 'roomId')
  if (!slug || !roomId) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug and roomId are required' })
  }

  return await relayProjectCommunicationJson<CommunicationKeyBundlesResponse>(event, slug, {
    path: `/v1/rooms/${roomId}/key-bundles`,
  })
})