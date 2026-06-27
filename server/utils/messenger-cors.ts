import type { H3Event } from 'h3'

const DEV_MESSENGER_ORIGINS = [
  'http://127.0.0.1:3327',
  'http://localhost:3327',
  'http://127.0.0.1:3300',
  'http://localhost:3300',
]

const DEV_MESSENGER_ORIGIN_PATTERNS = [
  /^http:\/\/127\.0\.0\.1:\d+$/,
  /^http:\/\/localhost:\d+$/,
]

function parseConfiguredOrigins() {
  const raw = [
    process.env.MESSENGER_WEB_ORIGINS,
    process.env.MESSENGER_WEB_ORIGIN,
    process.env.NUXT_PUBLIC_MESSENGER_WEB_ORIGIN,
  ]
    .filter(Boolean)
    .join(',')

  return raw
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function getNodeResponse(event: H3Event) {
  return event.node?.res || null
}

function getHeaderValue(event: H3Event, name: string) {
  const response = getNodeResponse(event)
  if (!response || typeof response.getHeader !== 'function') {
    return undefined
  }

  return response.getHeader(name)
}

function setHeaderValue(event: H3Event, name: string, value: string) {
  const response = getNodeResponse(event)
  if (!response || typeof response.setHeader !== 'function') {
    return false
  }

  response.setHeader(name, value)
  return true
}

function appendVaryHeader(event: H3Event, nextValue: string) {
  const current = getHeaderValue(event, 'Vary')
  const values = new Set(
    [current]
      .flat()
      .filter(Boolean)
      .flatMap(value => String(value).split(','))
      .map(value => value.trim())
      .filter(Boolean),
  )

  values.add(nextValue)
  setHeaderValue(event, 'Vary', Array.from(values).join(', '))
}

function isAllowedDevMessengerOrigin(origin: string) {
  return DEV_MESSENGER_ORIGINS.includes(origin)
    || DEV_MESSENGER_ORIGIN_PATTERNS.some(pattern => pattern.test(origin))
}

export function applyMessengerCors(event: H3Event, options: { methods?: string[] } = {}) {
  const origin = event.node?.req?.headers?.origin
  if (!origin) {
    return false
  }

  const allowedOrigins = new Set([...DEV_MESSENGER_ORIGINS, ...parseConfiguredOrigins()])
  if (!allowedOrigins.has(origin) && !isAllowedDevMessengerOrigin(origin)) {
    return false
  }

  if (!setHeaderValue(event, 'Access-Control-Allow-Origin', origin)) {
    return false
  }

  setHeaderValue(event, 'Access-Control-Allow-Credentials', 'true')
  setHeaderValue(event, 'Access-Control-Allow-Methods', (options.methods || ['GET']).join(', '))
  setHeaderValue(event, 'Access-Control-Allow-Headers', 'Content-Type, x-csrf-token')
  appendVaryHeader(event, 'Origin')
  return true
}