/**
 * Rate-limiting middleware.
 * In-memory sliding-window rate limiter per IP address.
 * Different limits for auth, upload, and general API routes.
 */

interface RateBucket {
  count: number
  resetAt: number
}

// IP → route-group → bucket
const store = new Map<string, Map<string, RateBucket>>()

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [ip, groups] of store) {
    for (const [group, bucket] of groups) {
      if (bucket.resetAt < now) groups.delete(group)
    }
    if (groups.size === 0) store.delete(ip)
  }
}

interface RateConfig {
  /** Max requests in the window */
  max: number
  /** Window in milliseconds */
  windowMs: number
}

const RATE_CONFIGS: Record<string, RateConfig> = {
  auth:    { max: 10,  windowMs: 60_000 },    // 10 req/min for login
  upload:  { max: 30,  windowMs: 60_000 },    // 30 req/min for uploads
  api:     { max: 200, windowMs: 60_000 },    // 200 req/min general API
}

function getRouteGroup(path: string): string | null {
  if (path.startsWith('/api/auth/login') || path.startsWith('/api/auth/contractor-login')) return 'auth'
  if (path.includes('/upload') || path.includes('/photos')) return 'upload'
  if (path.startsWith('/api/')) return 'api'
  return null // No rate limit for static assets / pages
}

function getClientIp(event: any): string {
  const req = event.node?.req ?? event.req
  // Trust X-Forwarded-For from reverse proxy (first IP)
  const xff = req?.headers?.['x-forwarded-for']
  if (xff) {
    const first = (Array.isArray(xff) ? xff[0] : xff).split(',')[0].trim()
    if (first) return first
  }
  const realIp = req?.headers?.['x-real-ip']
  if (realIp) return Array.isArray(realIp) ? realIp[0] : realIp
  return req?.socket?.remoteAddress || '0.0.0.0'
}

export default defineEventHandler((event) => {
  const url = (event as any).node?.req?.url || event.path || ''
  const group = getRouteGroup(url)
  if (!group) return // No rate limit for non-API routes

  cleanup()

  const ip = getClientIp(event)
  const config = RATE_CONFIGS[group]
  const now = Date.now()

  if (!store.has(ip)) store.set(ip, new Map())
  const groups = store.get(ip)!

  let bucket = groups.get(group)
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + config.windowMs }
    groups.set(group, bucket)
  }

  bucket.count++

  const res = (event as any).node?.res ?? (event as any).res
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('X-RateLimit-Limit', String(config.max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, config.max - bucket.count)))
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))
  }

  if (bucket.count > config.max) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests — попробуйте позже',
    })
  }
})
