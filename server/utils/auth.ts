import type { H3Event } from 'h3'
import bcrypt from 'bcryptjs'

// NOTE: h3 v2 RC bundled in Nitro has a bug where parseCookies calls
// event.req.headers.get() but event.req is deprecated and returns raw IncomingMessage.
// We bypass this by reading cookies directly from event.node.req.headers
// and writing via event.node.res.setHeader().

const ADMIN_COOKIE = 'daria_admin_session'
const CLIENT_COOKIE = 'daria_client_session'
const CONTRACTOR_COOKIE = 'daria_contractor_session'

// --- Low-level cookie helpers (Node.js-native, no h3 getCookie/setCookie) ---

function _parseCookies(event: H3Event): Record<string, string> {
  const req = (event as any).node?.req ?? (event as any).req
  const raw: string = req?.headers?.cookie || ''
  const result: Record<string, string> = {}
  raw.split(';').forEach(part => {
    const idx = part.indexOf('=')
    if (idx < 0) return
    const key = part.slice(0, idx).trim()
    const val = part.slice(idx + 1).trim()
    try { result[key] = decodeURIComponent(val) } catch { result[key] = val }
  })
  return result
}

function _readCookie(event: H3Event, name: string): string | undefined {
  return _parseCookies(event)[name]
}

function _isSecure(event: H3Event): boolean {
  const req = (event as any).node?.req ?? (event as any).req
  return req.headers["x-forwarded-proto"] === "https" || process.env.FORCE_HTTPS === "true"
}

function _writeCookie(event: H3Event, name: string, value: string, opts: {
  httpOnly?: boolean; sameSite?: string; secure?: boolean; maxAge?: number; path?: string; expires?: Date
}) {
  const res = (event as any).node?.res ?? (event as any).res
  let str = `${name}=${encodeURIComponent(value)}`
  if (opts.path) str += `; Path=${opts.path}`
  if (opts.httpOnly) str += '; HttpOnly'
  if (opts.sameSite) str += `; SameSite=${opts.sameSite}`
  if (opts.maxAge != null) str += `; Max-Age=${opts.maxAge}`
  if (opts.secure) str += '; Secure'
  const current = res.getHeader('Set-Cookie') as string | string[] | undefined
  const arr = current ? (Array.isArray(current) ? current : [current]) : []
  arr.push(str)
  res.setHeader('Set-Cookie', arr)
}

function _deleteCookie(event: H3Event, name: string) {
  _writeCookie(event, name, '', { path: '/', maxAge: 0 })
}

// --- Admin session (designer) ---

export function setAdminSession(event: H3Event, userId: number) {
  const v = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString('base64')
  _writeCookie(event, ADMIN_COOKIE, v, {
    httpOnly: true, sameSite: 'lax',
    secure: _isSecure(event),
    maxAge: 60 * 60 * 24 * 30, path: '/'
  })
}

export function getAdminSession(event: H3Event): { userId: number } | null {
  const raw = _readCookie(event, ADMIN_COOKIE)
  if (!raw) return null
  try { return JSON.parse(Buffer.from(raw, 'base64').toString()) } catch { return null }
}

export function clearAdminSession(event: H3Event) {
  _deleteCookie(event, ADMIN_COOKIE)
}

export function requireAdmin(event: H3Event) {
  const s = getAdminSession(event)
  if (!s) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  return s
}

// --- Client session ---

export function setClientSession(event: H3Event, projectSlug: string) {
  _writeCookie(event, CLIENT_COOKIE, projectSlug, {
    httpOnly: true, sameSite: 'lax',
    secure: _isSecure(event),
    maxAge: 60 * 60 * 24 * 30, path: '/'
  })
}

export function getClientSession(event: H3Event): string | null {
  return _readCookie(event, CLIENT_COOKIE) || null
}

export function clearClientSession(event: H3Event) {
  _deleteCookie(event, CLIENT_COOKIE)
}

export function requireClient(event: H3Event, projectSlug?: string) {
  const slug = getClientSession(event)
  if (!slug || (projectSlug && slug !== projectSlug))
    throw createError({ statusCode: 401, statusMessage: 'Client not authenticated' })
  return slug
}

// --- Contractor session ---

export function setContractorSession(event: H3Event, contractorId: number) {
  _writeCookie(event, CONTRACTOR_COOKIE, String(contractorId), {
    httpOnly: true, sameSite: 'lax',
    secure: _isSecure(event),
    maxAge: 60 * 60 * 24 * 30, path: '/'
  })
}

export function getContractorSession(event: H3Event): number | null {
  const raw = _readCookie(event, CONTRACTOR_COOKIE)
  return raw ? Number(raw) : null
}

export function clearContractorSession(event: H3Event) {
  _deleteCookie(event, CONTRACTOR_COOKIE)
}

export function requireContractor(event: H3Event) {
  const id = getContractorSession(event)
  if (!id) throw createError({ statusCode: 401, statusMessage: 'Contractor not authenticated' })
  return id
}

// --- Password helpers ---

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12)
}
export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}
