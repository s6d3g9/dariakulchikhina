/**
 * Security headers middleware (Helmet-like).
 * Sets CSP, X-Frame-Options, X-Content-Type-Options, etc.
 */

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

function buildContentSecurityPolicy(event: Parameters<typeof defineEventHandler>[0] extends (event: infer T) => any ? T : never) {
  const config = useRuntimeConfig(event)
  const connectSources = ["'self'", 'https:', 'wss:', ...deriveRealtimeOrigins(config.public.communicationsServiceUrl?.trim())]

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api-maps.yandex.ru https://yandex.st https://*.yastatic.net https://*.yandex.net https://*.yandex.ru",
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

export default defineEventHandler((event) => {
  const res = (event as any).node?.res ?? (event as any).res
  if (!res || typeof res.setHeader !== 'function') return

  // Prevent XSS — Content-Security-Policy
  res.setHeader('Content-Security-Policy', buildContentSecurityPolicy(event))

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')

  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // HSTS — tells browsers to always use HTTPS for 1 year (ignored on HTTP per RFC 6797)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')

  // Permissions policy (disable sensitive APIs)
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=()')

  // HSTS (if behind HTTPS proxy)
  const proto = (event as any).node?.req?.headers?.['x-forwarded-proto']
  if (proto === 'https' || process.env.FORCE_HTTPS === 'true') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // Prevent leaking server info
  res.removeHeader('X-Powered-By')
})
