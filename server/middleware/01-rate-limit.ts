/**
 * Rate-limiting middleware.
 * Uses Redis (atomic INCR + TTL) when available; falls back to in-memory
 * sliding-window per IP address when Redis is unreachable.
 * Different limits for auth, upload, and general API routes.
 */
import { redisIncr, redisTtl, isRedisAlive } from '~/server/utils/redis'

// ── In-memory fallback ────────────────────────────────────────────────────────

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

// Redis availability cache — re-check every 30 s to avoid hammering a down Redis
let _redisOk: boolean | null = null
let _redisCheckAt = 0

async function _isRedisOk(): Promise<boolean> {
  const now = Date.now()
  if (_redisOk !== null && now - _redisCheckAt < 30_000) return _redisOk
  try {
    _redisOk = await isRedisAlive()
  } catch {
    _redisOk = false
  }
  _redisCheckAt = now
  return _redisOk
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
  if (path.startsWith('/api/auth/login') || path.startsWith('/api/auth/contractor-login') || path.startsWith('/api/auth/client-login')) return 'auth'
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

export default defineEventHandler(async (event) => {
  const url = (event as any).node?.req?.url || event.path || ''
  const group = getRouteGroup(url)
  if (!group) return // No rate limit for non-API routes

  const ip = getClientIp(event)
  const config = RATE_CONFIGS[group]
  const now = Date.now()

  let count: number
  let resetAt: number

  // ── Try Redis path ──────────────────────────────────────────────────────────
  const useRedis = await _isRedisOk()
  if (useRedis) {
    try {
      const redisKey = `daria:rl:${group}:${ip}`
      const windowSec = Math.ceil(config.windowMs / 1000)
      count = await redisIncr(redisKey, windowSec)
      const ttl = await redisTtl(redisKey)
      resetAt = now + ttl * 1000
    } catch {
      // Redis failed mid-request — invalidate cache, fall through to in-memory
      _redisOk = false
      _redisCheckAt = Date.now()
      count = 1
      resetAt = now + config.windowMs
    }
  } else {
    // ── In-memory fallback ────────────────────────────────────────────────────
    cleanup()
    if (!store.has(ip)) store.set(ip, new Map())
    const groups = store.get(ip)!
    let bucket = groups.get(group)
    if (!bucket || bucket.resetAt < now) {
      bucket = { count: 0, resetAt: now + config.windowMs }
      groups.set(group, bucket)
    }
    bucket.count++
    count   = bucket.count
    resetAt = bucket.resetAt
  }

  const res = (event as any).node?.res ?? (event as any).res
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('X-RateLimit-Limit',     String(config.max))
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, config.max - count)))
    res.setHeader('X-RateLimit-Reset',     String(Math.ceil(resetAt / 1000)))
  }

  if (count > config.max) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too Many Requests',
      message: 'Слишком много запросов — попробуйте позже',
    })
  }
})
