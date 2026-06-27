import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'

import { createApiV1Envelope } from '~/server/utils/api-v1'

export function getRequiredApiV1ProjectSlug(event: H3Event) {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Project slug is required' })
  }
  return slug
}

export function getRequiredApiV1CommunicationRoomId(event: H3Event) {
  const roomId = getRouterParam(event, 'roomId')
  if (!roomId) {
    throw createError({ statusCode: 400, statusMessage: 'Communication roomId is required' })
  }
  return roomId
}

export function createApiV1CommunicationRelayRevision(prefix: string, data: unknown) {
  const revisionHash = createHash('sha1')
    .update(JSON.stringify(data))
    .digest('hex')

  return `${prefix}:${revisionHash}`
}

export function createApiV1CommunicationRelayEnvelope<T>(
  event: H3Event,
  data: T,
  prefix: string,
) {
  return createApiV1Envelope(event, data, {
    revision: createApiV1CommunicationRelayRevision(prefix, data),
  })
}
