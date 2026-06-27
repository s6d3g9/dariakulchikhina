/**
 * Rate-limiting middleware.
 * Redis-backed sliding-window rate limiter per IP address.
 * Falls back to in-memory Map if Redis is unavailable.
 * Different limits for auth, upload, and general API routes.
 */
import { eventHandler } from 'h3'
import Redis from 'ioredis'

import { markEventHandler } from '~/server/utils/mark-event-handler'

interface RateConfig {
  /** Max requests in the window */
  max: number
  /** Window in milliseconds */
  windowMs: number
}

const RATE_CONFIGS: Record<string, RateConfig> = {
  auth:     { max: 10,  windowMs: 60_000 },    // 10 req/min for login
  register: { max: 3,   windowMs: 300_000 },   // 3 req/5min for registration
  recover:  { max: 5,   windowMs: 900_000 },   // 5 req/15min for recovery — brute-force resistant
  upload:   { max: 30,  windowMs: 60_000 },    // 30 req/min for uploads
  api:      { max: 200, windowMs: 60_000 },    // 200 req/min general API
}

// --- Redis connection (lazy singleton) ---
let redis: Redis | null = null
let redisAvailable = true

function getRedis(): Redis | null {
  if (!redisAvailable) return null
  if (redis) return redis

  const url = process.env.REDIS_URL
  if (!url) {
    redisAvailable = false
    return null
  }

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 2000,
      enableOfflineQueue: false,
    })
    redis.connect().catch(() => {
      redisAvailable = false
      redis = null
    })
    redis.on('error', () => {
      redisAvailable = false
      redis = null
    })
    return redis
  } catch {
    redisAvailable = false
    return null
  }
}

// --- In-memory fallback ---
interface RateBucket { count: number; resetAt: number }
const memoryStore = new Map<string, Map<string, RateBucket>>()
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function memoryCleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [ip, groups] of memoryStore) {
    for (const [group, bucket] of groups) {
      if (bucket.resetAt < now) groups.delete(group)
    }
    if (groups.size === 0) memoryStore.delete(ip)
  }
}

async function checkRateRedis(ip: string, group: string, config: RateConfig): Promise<{ count: number; resetAt: number }> {
  const r = getRedis()
  if (!r) return checkRateMemory(ip, group, config)

  const key = `rl:${group}:${ip}`
  const windowSec = Math.ceil(config.windowMs / 1000)

  try {
    const count = await r.incr(key)
    if (count === 1) {
      await r.expire(key, windowSec)
    }
    const ttl = await r.ttl(key)
    return { count, resetAt: Date.now() + ttl * 1000 }
  } catch {
    return checkRateMemory(ip, group, config)
  }
}

function checkRateMemory(ip: string, group: string, config: RateConfig): { count: number; resetAt: number } {
  memoryCleanup()
  const now = Date.now()
  if (!memoryStore.has(ip)) memoryStore.set(ip, new Map())
  const groups = memoryStore.get(ip)!
  let bucket = groups.get(group)
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + config.windowMs }
    groups.set(group, bucket)
  }
  bucket.count++
  return { count: bucket.count, resetAt: bucket.resetAt }
}

function getRouteGroup(path: string): string | null {
  if (
    path.startsWith('/api/auth/recover')
    || path.startsWith('/api/auth/client-recover')
    || path.startsWith('/api/auth/contractor-recover')
  ) return 'recover'
  if (
    path.startsWith('/api/auth/register')
    || path.startsWith('/api/auth/client-register')
    || path.startsWith('/api/auth/contractor-register')
  ) return 'register'
  if (path.startsWith('/api/auth/login') || path.startsWith('/api/auth/contractor-login') || path.startsWith('/api/auth/client-login')) return 'auth'
  if (path.includes('/upload') || path.includes('/photos')) return 'upload'
  if (path.startsWith('/api/')) return 'api'
  return null // No rate limit for static assets / pages
}

function getClientIp(event: any): string {
  const req = event.node?.req ?? event.req
  // Prefer X-Real-IP set by nginx (cannot be spoofed if proxy_set_header is configured)
  const realIp = req?.headers?.['x-real-ip']
  if (realIp) return (Array.isArray(realIp) ? realIp[0] : realIp).trim()
  // Fallback to X-Forwarded-For — take the LAST IP (closest proxy-added entry)
  const xff = req?.headers?.['x-forwarded-for']
  if (xff) {
    const parts = (Array.isArray(xff) ? xff[0] : xff).split(',').map((s: string) => s.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }
  return req?.socket?.remoteAddress || '0.0.0.0'
}

export default markEventHandler(eventHandler({
  async handler(event) {
    const url = (event as any).node?.req?.url || event.path || ''
    const group = getRouteGroup(url)
    if (!group) return

    const ip = getClientIp(event)
    const config = RATE_CONFIGS[group]

    const { count, resetAt } = await checkRateRedis(ip, group, config)

    const res = (event as any).node?.res ?? (event as any).res
    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', String(config.max))
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, config.max - count)))
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)))
    }

    if (count > config.max) {
      throw createError({
        statusCode: 429,
        statusMessage: 'Too Many Requests — попробуйте позже',
      })
    }
  },
}))
