/**
 * Progressive login throttle.
 * After 3 failed attempts from the same IP within a window,
 * introduces exponential delay: 1s, 2s, 4s, 8s, …, capped at 30s.
 * Resets on successful login.
 */

interface ThrottleEntry {
  failures: number
  lastAttempt: number
}

const store = new Map<string, ThrottleEntry>()
const WINDOW_MS = 15 * 60 * 1000    // 15 min window
const FREE_ATTEMPTS = 3              // first 3 failures are free
const MAX_DELAY_MS = 30_000          // max 30s delay
const CLEANUP_INTERVAL = 5 * 60_000  // cleanup every 5 min
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [ip, entry] of store) {
    if (now - entry.lastAttempt > WINDOW_MS) store.delete(ip)
  }
}

/** Record a failed login attempt. Returns delay in ms that should be enforced. */
export function recordLoginFailure(ip: string): number {
  cleanup()
  const now = Date.now()
  const entry = store.get(ip)
  if (!entry || now - entry.lastAttempt > WINDOW_MS) {
    store.set(ip, { failures: 1, lastAttempt: now })
    return 0
  }
  entry.failures++
  entry.lastAttempt = now
  if (entry.failures <= FREE_ATTEMPTS) return 0
  return Math.min(MAX_DELAY_MS, 1000 * Math.pow(2, entry.failures - FREE_ATTEMPTS - 1))
}

/** Record a successful login — clears throttle for this IP. */
export function recordLoginSuccess(ip: string): void {
  store.delete(ip)
}

/** Get required delay before allowing login attempt. Returns ms to wait. */
export function getLoginDelay(ip: string): number {
  const entry = store.get(ip)
  if (!entry || entry.failures <= FREE_ATTEMPTS) return 0
  const elapsed = Date.now() - entry.lastAttempt
  const required = Math.min(MAX_DELAY_MS, 1000 * Math.pow(2, entry.failures - FREE_ATTEMPTS - 1))
  return Math.max(0, required - elapsed)
}

/** Extract client IP from H3 event (same logic as rate-limit middleware). */
export function getClientIp(event: any): string {
  const req = event.node?.req ?? event.req
  const realIp = req?.headers?.['x-real-ip']
  if (realIp) return (Array.isArray(realIp) ? realIp[0] : realIp).trim()
  const xff = req?.headers?.['x-forwarded-for']
  if (xff) {
    const parts = (Array.isArray(xff) ? xff[0] : xff).split(',').map((s: string) => s.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]
  }
  return req?.socket?.remoteAddress || '0.0.0.0'
}

/** Enforce throttle: wait if needed, then throw 429 if delay is extreme. */
export async function enforceLoginThrottle(event: any): Promise<void> {
  const ip = getClientIp(event)
  const delay = getLoginDelay(ip)
  if (delay > 0) {
    if (delay >= MAX_DELAY_MS) {
      throw createError({ statusCode: 429, statusMessage: 'Слишком много попыток. Повторите позже.' })
    }
    await new Promise(resolve => setTimeout(resolve, delay))
  }
}
