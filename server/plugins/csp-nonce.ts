/**
 * Nitro plugin: nonce-based CSP.
 *
 * Generates a cryptographically random nonce per request,
 * injects it into all inline <script> tags in rendered HTML,
 * and sets the Content-Security-Policy header with that nonce.
 *
 * This eliminates the need for 'unsafe-inline' in script-src.
 */
import { randomBytes } from 'crypto'

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

    return Array.from(new Set(origins))
  } catch {
    return []
  }
}

function buildContentSecurityPolicy(event: Parameters<Parameters<typeof defineNitroPlugin>[0]>[0] extends infer T ? any : never, nonce: string) {
  const config = useRuntimeConfig(event)
  const connectSources = ["'self'", 'https:', 'wss:', ...deriveRealtimeOrigins(config.public.communicationsServiceUrl?.trim())]

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'unsafe-inline' 'unsafe-eval' https://api-maps.yandex.ru https://yandex.st https://*.yastatic.net https://*.yandex.net https://*.yandex.ru`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    `connect-src ${Array.from(new Set(connectSources)).join(' ')}`,
    "frame-src https://yandex.ru https://*.yandex.ru https://yandex.com https://*.yandex.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ')
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    // Generate a unique nonce per request
    const nonce = randomBytes(16).toString('base64')

    // Store nonce on event so security-headers middleware can read it
    ;(event as any).__cspNonce = nonce

    // Add nonce to all inline scripts in every HTML section
    const sections: (keyof typeof html)[] = ['head', 'bodyAppend', 'bodyPrepend']
    for (const section of sections) {
      const arr = html[section]
      if (!Array.isArray(arr)) continue
      for (let i = 0; i < arr.length; i++) {
        // Add nonce to <script> tags that don't already have it
        arr[i] = arr[i].replace(
          /<script(?![^>]*\bnonce=)/gi,
          `<script nonce="${nonce}"`
        )
      }
    }
  })

  // After HTML is rendered, update the CSP header with the nonce
  nitroApp.hooks.hook('render:response', (response, { event }) => {
    const nonce = (event as any).__cspNonce
    if (!nonce) return

    // Override the CSP header set by middleware
    response.headers = response.headers || {}
    response.headers['content-security-policy'] = buildContentSecurityPolicy(event, nonce)
  })
})
