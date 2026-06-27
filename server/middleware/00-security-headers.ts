/**
 * Security headers middleware (Helmet-like).
 * Sets CSP, X-Frame-Options, X-Content-Type-Options, etc.
 */
import { eventHandler } from 'h3'

import { markEventHandler } from '~/server/utils/mark-event-handler'
import { buildContentSecurityPolicy, buildPermissionsPolicy } from '~/server/utils/security-headers'

export default markEventHandler(eventHandler({
  handler(event) {
    const res = (event as any).node?.res ?? (event as any).res
    if (!res || typeof res.setHeader !== 'function') return

    res.setHeader('Content-Security-Policy', buildContentSecurityPolicy(event))
    res.setHeader('X-Frame-Options', 'SAMEORIGIN')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

    const proto = (event as any).node?.req?.headers?.['x-forwarded-proto']
    if (proto === 'https' || process.env.FORCE_HTTPS === 'true' || process.env.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    }

    res.setHeader('Permissions-Policy', buildPermissionsPolicy())
    res.removeHeader('X-Powered-By')

    // Prevent caching of API responses with personal/auth data
    const url: string = (event as any).node?.req?.url || ''
    if (url.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'private, no-store')
    }
  },
}))
