import type { CommunicationKeyBundle } from '~/shared/types/communications'
import { CommunicationPublishKeyBundleDtoSchema } from '~/shared/types/communications'
import { relayProjectCommunicationJson } from '~/server/utils/project-communications-relay'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const roomId = getRouterParam(event, 'roomId')
  if (!slug || !roomId) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug and roomId are required' })
  }

  const body = await readValidatedBody(event, CommunicationPublishKeyBundleDtoSchema.parse)
  return await relayProjectCommunicationJson<{ keyBundle: CommunicationKeyBundle }>(event, slug, {
    method: 'POST',
    path: `/v1/rooms/${roomId}/key-bundles`,
    body,
  })
})