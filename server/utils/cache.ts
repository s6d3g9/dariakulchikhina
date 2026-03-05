/**
 * Redis-backed cache utilities.
 *
 * Falls back gracefully when Redis is unavailable — the factory function
 * is always called and the result is returned, just not stored.
 *
 * Usage:
 *   const data = await withCache('contractors:all', 60, () => db.select()...)
 *   await invalidateCache('contractors:all')
 *   await invalidateCacheByPrefix('contractors:')
 */
import { getRedis } from './redis'

const PREFIX = 'daria:cache:'

/**
 * Cache-aside pattern with Redis.
 *
 * @param key        — cache key (without prefix)
 * @param ttlSeconds — how long to cache the result
 * @param fn         — async factory to compute value on cache miss
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const redis = getRedis()
  const fullKey = `${PREFIX}${key}`

  // Try to read from cache
  try {
    const hit = await redis.get(fullKey)
    if (hit !== null) return JSON.parse(hit) as T
  } catch { /* Redis unavailable — skip cache */ }

  // Compute value
  const value = await fn()

  // Store in cache (fire-and-forget — don't block response on Redis)
  redis.set(fullKey, JSON.stringify(value), 'EX', ttlSeconds).catch(() => {})

  return value
}

/** Delete a single cache entry */
export async function invalidateCache(key: string): Promise<void> {
  try {
    await getRedis().del(`${PREFIX}${key}`)
  } catch { /* ignore */ }
}

/**
 * Delete all cache keys matching a prefix.
 * Uses SCAN to avoid blocking Redis with KEYS command.
 *
 * @example invalidateCacheByPrefix('contractors:')
 */
export async function invalidateCacheByPrefix(prefix: string): Promise<void> {
  try {
    const redis    = getRedis()
    const pattern  = `${PREFIX}${prefix}*`
    let   cursor   = '0'

    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = next
      if (keys.length > 0) await redis.del(...keys)
    } while (cursor !== '0')
  } catch { /* ignore */ }
}

/**
 * Wrap a function with Redis distributed lock (simple SETNX-based).
 * Returns false if lock is already held; true if acquired and fn executed.
 * Use for preventing duplicate background jobs.
 *
 * @param lockKey    — unique key for this lock
 * @param ttlSeconds — how long to hold the lock at most
 * @param fn         — function to execute while holding the lock
 */
export async function withLock(
  lockKey: string,
  ttlSeconds: number,
  fn: () => Promise<void>,
): Promise<boolean> {
  const redis   = getRedis()
  const fullKey = `daria:lock:${lockKey}`
  try {
    const acquired = await redis.set(fullKey, '1', 'EX', ttlSeconds, 'NX')
    if (!acquired) return false
    try {
      await fn()
    } finally {
      await redis.del(fullKey).catch(() => {})
    }
    return true
  } catch {
    return false
  }
}
