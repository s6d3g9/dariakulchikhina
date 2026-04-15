import type { H3Event } from 'h3'
import { getResponseHeader, setResponseHeader } from 'h3'

const DEV_MESSENGER_ORIGINS = [
  'http://127.0.0.1:3327',
  'http://localhost:3327',
  'http://127.0.0.1:3300',
  'http://localhost:3300',
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

function appendVaryHeader(event: H3Event, nextValue: string) {
  const current = getResponseHeader(event, 'Vary')
  const values = new Set(
    [current]
      .flat()
      .filter(Boolean)
      .flatMap(value => String(value).split(','))
      .map(value => value.trim())
      .filter(Boolean),
  )

  values.add(nextValue)
  setResponseHeader(event, 'Vary', Array.from(values).join(', '))
}

export function applyMessengerCors(event: H3Event, options: { methods?: string[] } = {}) {
  const origin = event.node?.req?.headers?.origin
  if (!origin) {
    return false
  }

  const allowedOrigins = new Set([...DEV_MESSENGER_ORIGINS, ...parseConfiguredOrigins()])
  if (!allowedOrigins.has(origin)) {
    return false
  }

  setResponseHeader(event, 'Access-Control-Allow-Origin', origin)
  setResponseHeader(event, 'Access-Control-Allow-Credentials', 'true')
  setResponseHeader(event, 'Access-Control-Allow-Methods', (options.methods || ['GET']).join(', '))
  setResponseHeader(event, 'Access-Control-Allow-Headers', 'Content-Type, x-csrf-token')
  appendVaryHeader(event, 'Origin')
  return true
}