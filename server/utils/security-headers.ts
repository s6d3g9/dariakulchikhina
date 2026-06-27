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
  const pub = config.public as Record<string, unknown>
  const connectSources = ["'self'"]

  // Yandex Maps geocoding and suggest APIs
  pushUnique(connectSources, 'https://geocode-maps.yandex.ru')
  pushUnique(connectSources, 'https://suggest-maps.yandex.ru')
  pushUnique(connectSources, 'https://api-maps.yandex.ru')
  pushUnique(connectSources, 'https://*.yandex.net')

  // Communications service (HTTP + WebSocket)
  for (const origin of deriveRealtimeOrigins((pub.communicationsServiceUrl as string | undefined)?.trim())) {
    pushUnique(connectSources, origin)
  }

  // Messenger core if configured
  const messengerCoreUrl = pub.messengerCoreBaseUrl as string | undefined
  if (messengerCoreUrl?.trim()) {
    try {
      const parsed = new URL(messengerCoreUrl.trim())
      pushUnique(connectSources, parsed.origin)
      pushUnique(connectSources, parsed.protocol === 'https:' ? `wss://${parsed.host}` : `ws://${parsed.host}`)
    } catch {}
  }

  return [
    "default-src 'self'",
    nonce
      ? `script-src 'self' 'nonce-${nonce}' https://api-maps.yandex.ru https://yandex.st https://*.yastatic.net https://*.yandex.net https://*.yandex.ru`
      : "script-src 'self' 'unsafe-inline' https://api-maps.yandex.ru https://yandex.st https://*.yastatic.net https://*.yandex.net https://*.yandex.ru",
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