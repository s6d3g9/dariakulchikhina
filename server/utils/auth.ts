/**
 * Auth utilities — session management + access guards.
 *
 * Sessions are stored as HS256 JWT tokens in HttpOnly cookies.
 * signJwtSync / verifyJwtSync use Node.js crypto directly, so all guards
 * stay synchronous — no await needed in the 90+ handler files that call them.
 * The produced tokens are also verifiable by jose (async).
 *
 * Three session types:
 *   daria_admin_session      — admin / designer  { sub:'admin',  role:'admin',      userId }
 *   daria_client_session     — client/customer   { sub:'client', role:'client',      projectSlug }
 *   daria_contractor_session — contractor        { sub:'contractor', role:'contractor', contractorId }
 */
import type { H3Event } from 'h3'
import bcrypt from 'bcryptjs'
import { signJwtSync, verifyJwtSync } from './jwt'

export const ADMIN_COOKIE      = 'daria_admin_session'
export const CLIENT_COOKIE     = 'daria_client_session'
export const CONTRACTOR_COOKIE = 'daria_contractor_session'

const SESSION_MAX_AGE_SEC = 30 * 24 * 60 * 60 // 30 days

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
  const token = signJwtSync({ sub: 'admin', role: 'admin', userId }, SESSION_MAX_AGE_SEC)
  _writeCookie(event, ADMIN_COOKIE, token, {
    httpOnly: true, sameSite: 'lax',
    secure: _isSecure(event),
    maxAge: SESSION_MAX_AGE_SEC, path: '/'
  })
}

export function getAdminSession(event: H3Event): { userId: number } | null {
  const raw = _readCookie(event, ADMIN_COOKIE)
  if (!raw) return null
  const data = verifyJwtSync<{ userId?: unknown; role?: string }>(raw)
  if (!data || data.role !== 'admin' || typeof data.userId !== 'number') return null
  return { userId: data.userId }
}

export function clearAdminSession(event: H3Event) {
  _deleteCookie(event, ADMIN_COOKIE)
}

export function requireAdmin(event: H3Event) {
  const s = getAdminSession(event)
  if (!s) throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Требуется авторизация администратора' })
  return s
}

// --- Client session ---

export function setClientSession(event: H3Event, projectSlug: string) {
  const token = signJwtSync({ sub: 'client', role: 'client', projectSlug }, SESSION_MAX_AGE_SEC)
  _writeCookie(event, CLIENT_COOKIE, token, {
    httpOnly: true, sameSite: 'lax',
    secure: _isSecure(event),
    maxAge: SESSION_MAX_AGE_SEC, path: '/'
  })
}

export function getClientSession(event: H3Event): string | null {
  const raw = _readCookie(event, CLIENT_COOKIE)
  if (!raw) return null
  const data = verifyJwtSync<{ projectSlug?: unknown; role?: string }>(raw)
  if (!data || data.role !== 'client' || typeof data.projectSlug !== 'string') return null
  return data.projectSlug
}

export function clearClientSession(event: H3Event) {
  _deleteCookie(event, CLIENT_COOKIE)
}

export function requireClient(event: H3Event, projectSlug?: string) {
  const slug = getClientSession(event)
  if (!slug || (projectSlug && slug !== projectSlug))
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Требуется авторизация клиента' })
  return slug
}

// --- Contractor session ---

export function setContractorSession(event: H3Event, contractorId: number) {
  const token = signJwtSync({ sub: 'contractor', role: 'contractor', contractorId }, SESSION_MAX_AGE_SEC)
  _writeCookie(event, CONTRACTOR_COOKIE, token, {
    httpOnly: true, sameSite: 'lax',
    secure: _isSecure(event),
    maxAge: SESSION_MAX_AGE_SEC, path: '/'
  })
}

export function getContractorSession(event: H3Event): number | null {
  const raw = _readCookie(event, CONTRACTOR_COOKIE)
  if (!raw) return null
  const data = verifyJwtSync<{ contractorId?: unknown; role?: string }>(raw)
  if (!data || data.role !== 'contractor' || typeof data.contractorId !== 'number') return null
  return data.contractorId
}

export function clearContractorSession(event: H3Event) {
  _deleteCookie(event, CONTRACTOR_COOKIE)
}

export function requireContractor(event: H3Event) {
  const id = getContractorSession(event)
  if (!id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Требуется авторизация подрядчика' })
  return id
}

/** Require admin OR an authenticated contractor with the given id */
export function requireAdminOrContractor(event: H3Event, contractorId: number) {
  const admin = getAdminSession(event)
  if (admin) return { role: 'admin' as const, adminUserId: admin.userId }
  const cid = getContractorSession(event)
  if (cid && cid === contractorId) return { role: 'contractor' as const, contractorId: cid }
  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
}

/** Require admin OR an authenticated client for this project slug */
export function requireAdminOrClient(event: H3Event, projectSlug: string) {
  const admin = getAdminSession(event)
  if (admin) return { role: 'admin' as const, adminUserId: admin.userId }
  const slug = getClientSession(event)
  if (slug && slug === projectSlug) return { role: 'client' as const, projectSlug: slug }
  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
}

// --- Combined guards ---

/** Returns IP for the current request (respects X-Forwarded-For). */
export function getClientIp(event: H3Event): string {
  const req = (event as any).node?.req ?? (event as any).req
  const forwarded = req?.headers?.['x-forwarded-for']
  if (forwarded) return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim()
  return req?.socket?.remoteAddress ?? req?.connection?.remoteAddress ?? 'unknown'
}

/**
 * Require any authenticated session (admin, client, or contractor).
 * Returns a discriminated union with role + identity.
 */
export function requireAnySession(event: H3Event) {
  const admin = getAdminSession(event)
  if (admin) return { role: 'admin' as const, userId: admin.userId }
  const slug = getClientSession(event)
  if (slug) return { role: 'client' as const, projectSlug: slug }
  const cid = getContractorSession(event)
  if (cid) return { role: 'contractor' as const, contractorId: cid }
  throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
}

// --- Password helpers ---

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12)
}
export async function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}
