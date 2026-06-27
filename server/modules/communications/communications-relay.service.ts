import type { H3Event } from 'h3'

import { buildProjectCommunicationBootstrap } from '~/server/modules/communications/communications-bootstrap.service'

const ALLOWED_RELAY_HOSTS = new Set<string>()

function getAllowedRelayHosts() {
  if (ALLOWED_RELAY_HOSTS.size === 0) {
    const config = useRuntimeConfig()
    const serviceUrl = config.public.communicationsServiceUrl?.trim()
    if (serviceUrl) {
      try {
        ALLOWED_RELAY_HOSTS.add(new URL(serviceUrl).host)
      } catch {}
    }
    ALLOWED_RELAY_HOSTS.add('localhost')
    ALLOWED_RELAY_HOSTS.add('127.0.0.1')
  }
  return ALLOWED_RELAY_HOSTS
}

function validateRelayUrl(url: string) {
  try {
    const parsed = new URL(url)
    if (!getAllowedRelayHosts().has(parsed.host)) {
      throw new Error(`SSRF_BLOCKED: relay to ${parsed.host} is not allowed`)
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`SSRF_BLOCKED: protocol ${parsed.protocol} is not allowed`)
    }
    return url
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('SSRF_BLOCKED')) {
      throw error
    }
    throw new Error('SSRF_BLOCKED: invalid URL')
  }
}

interface RelayJsonOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: unknown
  headers?: Record<string, string>
}

function trimBaseUrl(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value
}

const SAFE_RELAY_MESSAGES: Record<number, string> = {
  400: 'Некорректный запрос к коммуникационному сервису',
  401: 'Ошибка авторизации в коммуникационном сервисе',
  403: 'Нет доступа к коммуникационному ресурсу',
  404: 'Коммуникационный ресурс не найден',
  409: 'Конфликт данных в коммуникационном сервисе',
  429: 'Слишком много запросов к коммуникационному сервису',
}

function safeRelayStatusMessage(status: number, payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const msg = ('error' in payload && payload.error) || ('message' in payload && payload.message) || ''
    if (msg) console.error(`[relay] communications ${status}:`, String(msg).slice(0, 500))
  }
  return SAFE_RELAY_MESSAGES[status] || 'Коммуникационный сервис временно недоступен'
}

async function createProjectRelayRequest(event: H3Event, projectSlug: string, path: string, init: RequestInit) {
  const bootstrap = await buildProjectCommunicationBootstrap(event, projectSlug)
  const url = validateRelayUrl(`${trimBaseUrl(bootstrap.serviceUrl)}${path}`)

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
  let payload: unknown = null
  try {
    payload = raw ? JSON.parse(raw) as unknown : null
  } catch {
    // non-JSON response from communications service
  }

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: safeRelayStatusMessage(response.status, payload),
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
      statusMessage: safeRelayStatusMessage(response.status || 502, payload),
    })
  }

  const nodeResponse = event.node!.res
  nodeResponse!.statusCode = 200
  nodeResponse!.setHeader('Content-Type', response.headers.get('content-type') || 'text/event-stream; charset=utf-8')
  nodeResponse!.setHeader('Cache-Control', response.headers.get('cache-control') || 'no-cache, no-transform')
  nodeResponse!.setHeader('Connection', 'keep-alive')
  if ('flushHeaders' in nodeResponse!) (nodeResponse as any).flushHeaders()

  if (!response.body) {
    nodeResponse!.end()
    return
  }
  const reader = response.body.getReader()
  nodeResponse!.on('close', () => {
    reader.cancel().catch(() => {})
  })

  try {
    while (!nodeResponse!.writableEnded) {
      const chunk = await reader.read()
      if (chunk.done) {
        break
      }
      ;(nodeResponse!.write as Function)(Buffer.from(chunk.value))
    }
  } finally {
    reader.releaseLock()
    if (!nodeResponse!.writableEnded) {
      nodeResponse!.end()
    }
  }
}