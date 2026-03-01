/**
 * Security headers middleware (Helmet-like).
 * Sets CSP, X-Frame-Options, X-Content-Type-Options, etc.
 */
export default defineEventHandler((event) => {
  const res = (event as any).node?.res ?? (event as any).res
  if (!res || typeof res.setHeader !== 'function') return

  // Prevent XSS — Content-Security-Policy
  res.setHeader('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '))

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')

  // Prevent MIME-type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff')

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  // Permissions policy (disable sensitive APIs)
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')

  // HSTS (if behind HTTPS proxy)
  const proto = (event as any).node?.req?.headers?.['x-forwarded-proto']
  if (proto === 'https' || process.env.FORCE_HTTPS === 'true') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // Prevent leaking server info
  res.removeHeader('X-Powered-By')
})
