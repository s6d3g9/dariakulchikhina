/**
 * CSRF protection middleware — Double Submit Cookie pattern.
 *
 * - On every response: sets a `csrf_token` cookie (non-httpOnly, so JS can read it).
 * - On mutating requests (POST/PUT/PATCH/DELETE): validates that the
 *   `x-csrf-token` header matches the cookie value.
 *
 * Login and contractor-login are exempt (no prior cookie exists yet).
 */
import { randomBytes } from 'crypto'

const CSRF_COOKIE = 'csrf_token'
const CSRF_HEADER = 'x-csrf-token'
const TOKEN_LENGTH = 32

/** Routes exempt from CSRF check (user has no token yet) */
const EXEMPT_ROUTES = new Set([
  '/api/auth/login',
  '/api/auth/contractor-login',
])

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

export default defineEventHandler((event) => {
  const url = event.node?.req?.url || event.path || ''

  // Skip non-API routes (pages, assets)
  if (!url.startsWith('/api/')) return

  const method = (event.node?.req?.method || 'GET').toUpperCase()
  const isMutating = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'

  // Ensure a CSRF token cookie exists
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

  // Validate on mutating requests
  if (isMutating) {
    // Check exemptions
    const basePath = url.split('?')[0]
    if (EXEMPT_ROUTES.has(basePath)) return

    const headerToken = event.node?.req?.headers?.[CSRF_HEADER]
    if (!headerToken || headerToken !== token) {
      throw createError({
        statusCode: 403,
        statusMessage: 'CSRF token mismatch',
      })
    }
  }
})
