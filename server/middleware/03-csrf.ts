/**
 * CSRF protection middleware — Double Submit Cookie pattern.
 *
 * - On every response: sets a `csrf_token` cookie (non-httpOnly, so JS can read it).
 * - On mutating requests (POST/PUT/PATCH/DELETE): validates that the
 *   `x-csrf-token` header matches the cookie value.
 *
 * Login and contractor-login are exempt (no prior cookie exists yet).
 */
import { eventHandler } from 'h3'
import { randomBytes, timingSafeEqual } from 'crypto'

import { markEventHandler } from '~/server/utils/mark-event-handler'

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'
const TOKEN_LENGTH = 32

/** Routes exempt from CSRF check (user has no token yet) */
const EXEMPT_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/contractor-login',
  '/api/auth/client-login',
  '/api/auth/register',
  '/api/auth/contractor-register',
  '/api/auth/client-register',
  '/api/auth/recover',
  '/api/auth/contractor-recover',
  '/api/auth/client-recover',
])

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

function readCsrfCookie(event: any): string | undefined {
  const req = event.node?.req ?? event.req
  const raw: string = req?.headers?.cookie || ''
  for (const part of raw.split(';')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    const key = part.slice(0, idx).trim()
    if (key === CSRF_COOKIE) {
      try { return decodeURIComponent(part.slice(idx + 1).trim()) } catch { return undefined }
    }
  }
  return undefined
}

function isSecure(event: any): boolean {
  const req = event.node?.req ?? event.req
  return req?.headers?.['x-forwarded-proto'] === 'https' || process.env.FORCE_HTTPS === 'true'
}

export default markEventHandler(eventHandler({
  handler(event) {
    const url = event.node?.req?.url || event.path || ''
    if (!url.startsWith('/api/')) return

    const method = (event.node?.req?.method || 'GET').toUpperCase()
    const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'

    let token = readCsrfCookie(event)
    if (!token) {
      token = randomBytes(TOKEN_LENGTH).toString('hex')
      const res = event.node?.res ?? (event as any).res
      const secure = isSecure(event)
      const cookieStr = `${CSRF_COOKIE}=${token}; Path=/; SameSite=Lax${secure ? '; Secure' : ''}`
      const current = res.getHeader('Set-Cookie') as string | string[] | undefined
      const arr = current ? (Array.isArray(current) ? current : [current]) : []
      arr.push(cookieStr)
      res.setHeader('Set-Cookie', arr)
    }

    if (isMutating) {
      const basePath = url.split('?')[0]
      if (EXEMPT_ROUTES.has(basePath)) return

      const headerToken = event.node?.req?.headers?.[CSRF_HEADER]
      if (!headerToken || typeof headerToken !== 'string' || !safeCompare(headerToken, token)) {
        throw createError({
          statusCode: 403,
          statusMessage: 'CSRF token mismatch',
        })
      }
    }
  },
}))
