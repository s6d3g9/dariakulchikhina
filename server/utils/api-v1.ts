import type { H3Event } from 'h3'
import { getRequestHeader, setHeader } from 'h3'
import { randomUUID } from 'node:crypto'

import type { ApiV1Envelope } from '~/shared/types/api-v1'

const API_V1_REQUEST_ID_CONTEXT_KEY = '__apiV1RequestId'

export function getApiV1RequestId(event: H3Event) {
  const context = event.context as Record<string, unknown>
  const existing = context[API_V1_REQUEST_ID_CONTEXT_KEY]
  if (typeof existing === 'string' && existing) {
    setHeader(event, 'x-request-id', existing)
    return existing
  }

  const requestId = getRequestHeader(event, 'x-request-id') || randomUUID()
  context[API_V1_REQUEST_ID_CONTEXT_KEY] = requestId
  setHeader(event, 'x-request-id', requestId)
  return requestId
}

export function createApiV1Envelope<T>(
  event: H3Event,
  data: T,
  options: { revision?: string } = {},
): ApiV1Envelope<T> {
  const requestId = getApiV1RequestId(event)
  const generatedAt = new Date().toISOString()

  return {
    data,
    meta: {
      requestId,
      revision: options.revision || 'v1',
      generatedAt,
    },
    errors: [],
  }
}
