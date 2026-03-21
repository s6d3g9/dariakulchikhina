import type { H3Event } from 'h3'

import { buildProjectCommunicationBootstrap } from '~/server/utils/communications'

interface RelayJsonOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  headers?: Record<string, string>
}

function trimBaseUrl(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

function extractRelayErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') {
    return fallback
  }

  if ('error' in payload && typeof payload.error === 'string' && payload.error.trim()) {
    return payload.error
  }

  if ('message' in payload && typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message
  }

  if ('statusMessage' in payload && typeof payload.statusMessage === 'string' && payload.statusMessage.trim()) {
    return payload.statusMessage
  }

  return fallback
}

async function createProjectRelayRequest(event: H3Event, projectSlug: string, path: string, init: RequestInit) {
  const bootstrap = await buildProjectCommunicationBootstrap(event, projectSlug)
  const url = `${trimBaseUrl(bootstrap.serviceUrl)}${path}`

  return await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${bootstrap.accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
  })
}

export async function relayProjectCommunicationJson<T>(event: H3Event, projectSlug: string, options: RelayJsonOptions): Promise<T> {
  const response = await createProjectRelayRequest(event, projectSlug, options.path, {
    method: options.method || 'GET',
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: options.headers,
  })

  const raw = await response.text()
  const payload = raw ? JSON.parse(raw) as unknown : null

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: extractRelayErrorMessage(payload, 'Коммуникационный сервис временно недоступен'),
      data: payload,
    })
  }

  return payload as T
}

export async function relayProjectCommunicationEventStream(event: H3Event, projectSlug: string, roomId: string) {
  const response = await createProjectRelayRequest(event, projectSlug, `/v1/rooms/${roomId}/events`, {
    method: 'GET',
    headers: {
      Accept: 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  })

  if (!response.ok || !response.body) {
    const raw = await response.text().catch(() => '')
    let payload: unknown = null
    try {
      payload = raw ? JSON.parse(raw) as unknown : null
    } catch {
      payload = raw || null
    }

    throw createError({
      statusCode: response.status || 502,
      statusMessage: extractRelayErrorMessage(payload, 'Не удалось открыть поток событий коммуникаций'),
      data: payload,
    })
  }

  const nodeResponse = event.node.res
  nodeResponse.statusCode = 200
  nodeResponse.setHeader('Content-Type', response.headers.get('content-type') || 'text/event-stream; charset=utf-8')
  nodeResponse.setHeader('Cache-Control', response.headers.get('cache-control') || 'no-cache, no-transform')
  nodeResponse.setHeader('Connection', 'keep-alive')
  nodeResponse.flushHeaders?.()

  const reader = response.body.getReader()
  nodeResponse.on('close', () => {
    reader.cancel().catch(() => {})
  })

  try {
    while (!nodeResponse.writableEnded) {
      const chunk = await reader.read()
      if (chunk.done) {
        break
      }
      nodeResponse.write(Buffer.from(chunk.value))
    }
  } finally {
    reader.releaseLock()
    if (!nodeResponse.writableEnded) {
      nodeResponse.end()
    }
  }
}