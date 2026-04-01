import type { H3Event } from 'h3'

function pushUnique(target: string[], value: string | null | undefined) {
  if (!value || target.includes(value)) {
    return
  }

  target.push(value)
}

function deriveRealtimeOrigins(serviceUrl: string | null | undefined) {
  if (!serviceUrl) {
    return [] as string[]
  }

  try {
    const parsed = new URL(serviceUrl)
    const origins = [parsed.origin]

    if (parsed.protocol === 'http:') {
      origins.push(`ws://${parsed.host}`)
    } else if (parsed.protocol === 'https:') {
      origins.push(`wss://${parsed.host}`)
    } else if (parsed.protocol === 'ws:') {
      origins.push(`http://${parsed.host}`)
    } else if (parsed.protocol === 'wss:') {
      origins.push(`https://${parsed.host}`)
    }

    return origins
  } catch {
    return []
  }
}

export function buildContentSecurityPolicy(event: H3Event, nonce?: string) {
  const config = useRuntimeConfig()
  const connectSources = ["'self'", 'https:', 'wss:']

  for (const origin of deriveRealtimeOrigins(config.public.communicationsServiceUrl?.trim())) {
    pushUnique(connectSources, origin)
  }

  return [
    "default-src 'self'",
    nonce
      ? `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' https://api-maps.yandex.ru https://yandex.st https://*.yastatic.net https://*.yandex.net https://*.yandex.ru`
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api-maps.yandex.ru https://yandex.st https://*.yastatic.net https://*.yandex.net https://*.yandex.ru",
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    `connect-src ${connectSources.join(' ')}`,
    "frame-src https://yandex.ru https://*.yandex.ru https://yandex.com https://*.yandex.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

export function buildPermissionsPolicy() {
  return 'camera=(self), microphone=(self), geolocation=(), payment=()'
}