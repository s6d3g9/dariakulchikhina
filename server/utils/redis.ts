/**
 * Redis client singleton (ioredis).
 *
 * Lazily connected — first call to getRedis() triggers the connection.
 * All errors are swallowed with a console.warn so the app never crashes
 * if Redis is temporarily unavailable. Cache functions degrade gracefully.
 */
import Redis from 'ioredis'

let _client: Redis | null = null

export function getRedis(): Redis {
  if (_client) return _client

  const url = process.env.REDIS_URL || 'redis://localhost:6379'

  _client = new Redis(url, {
    lazyConnect:           true,
    maxRetriesPerRequest:  2,
    connectTimeout:        3000,
    commandTimeout:        2000,
    retryStrategy(times) {
      if (times > 4) return null // stop retrying after 4 attempts
      return Math.min(times * 300, 3000)
    },
  })

  _client.on('error', (err: Error) => {
    if (process.env.NODE_ENV !== 'test') {
      console.warn('[Redis] Error:', err.message)
    }
  })

  _client.on('connect', () => {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[Redis] Connected to', url.replace(/\/\/.*@/, '//***@'))
    }
  })

  return _client
}

/** Returns true if Redis responds to PING (used in health checks) */
export async function isRedisAlive(): Promise<boolean> {
  try {
    return (await getRedis().ping()) === 'PONG'
  } catch {
    return false
  }
}

/** Increment a counter key and set TTL on first increment. Returns new value. */
export async function redisIncr(key: string, ttlSeconds: number): Promise<number> {
  const redis = getRedis()
  const val = await redis.incr(key)
  if (val === 1) await redis.expire(key, ttlSeconds)
  return val
}

/** Get remaining TTL in seconds (-2 = key doesn't exist, -1 = no TTL) */
export async function redisTtl(key: string): Promise<number> {
  return getRedis().ttl(key)
}

/** Gracefully disconnect (useful in tests / shutdown hooks) */
export async function disconnectRedis(): Promise<void> {
  if (_client) {
    await _client.quit().catch(() => _client?.disconnect())
    _client = null
  }
}
