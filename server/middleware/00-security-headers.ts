/**
 * Security headers middleware (Helmet-like).
 * Sets CSP, X-Frame-Options, X-Content-Type-Options, etc.
 */
import { buildContentSecurityPolicy, buildPermissionsPolicy } from '~/server/utils/security-headers'

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
  res.setHeader('Permissions-Policy', buildPermissionsPolicy())

  // HSTS (if behind HTTPS proxy)
  const proto = (event as any).node?.req?.headers?.['x-forwarded-proto']
  if (proto === 'https' || process.env.FORCE_HTTPS === 'true') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  // Prevent leaking server info
  res.removeHeader('X-Powered-By')
})
